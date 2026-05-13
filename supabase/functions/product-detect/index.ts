import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type DetectionDraft = {
  name?: string;
  brand?: string;
  quantityValue?: string;
  unit?: string;
  category?: string;
  storage?: string;
  storageDetail?: string;
  expiryIso?: string;
  barcode?: string;
  notes?: string;
  confidence?: number;
  sources?: string[];
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing auth header' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const openAiKey = Deno.env.get('OPENAI_API_KEY') ?? '';

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const { household_id, barcode } = await req.json();
    if (!household_id || !barcode) {
      return json({ error: 'household_id and barcode are required' }, 400);
    }

    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('household_id', household_id)
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (!membership) {
      return json({ error: 'Forbidden' }, 403);
    }

    const { data: mapping } = await supabase
      .from('barcode_mappings')
      .select('name, brand, source')
      .eq('household_id', household_id)
      .eq('barcode', barcode)
      .maybeSingle();

    if (mapping) {
      return json({
        autofill: {
          barcode,
          name: mapping.name,
          brand: mapping.brand ?? undefined,
          confidence: 0.98,
          sources: [mapping.source],
        },
      });
    }

    const offResponse = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`);
    const offJson = offResponse.ok ? await offResponse.json() : null;
    const product = offJson?.product;

    const offDraft: DetectionDraft = {
      barcode,
      name: product?.product_name ?? undefined,
      brand: product?.brands?.split(',')?.[0]?.trim() || undefined,
      quantityValue: normalizeQuantity(product?.quantity).value,
      unit: normalizeQuantity(product?.quantity).unit,
      category: product?.categories_tags?.[0]?.replace('en:', '').replace(/-/g, ' ') ?? undefined,
      confidence: product?.product_name ? 0.72 : 0.2,
      sources: product?.product_name ? ['openfoodfacts'] : [],
    };

    if (!openAiKey || !offDraft.name) {
      return json({ autofill: offDraft });
    }

    const aiDraft = await enrichWithOpenAI(offDraft, openAiKey);
    return json({
      autofill: {
        ...offDraft,
        ...aiDraft,
        barcode,
        sources: Array.from(new Set([...(offDraft.sources ?? []), ...(aiDraft.sources ?? ['openai'])])),
      },
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unexpected error' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function normalizeQuantity(quantity?: string): { value?: string; unit?: string } {
  if (!quantity) return {};
  const match = quantity.match(/([0-9]+(?:[.,][0-9]+)?)\s*([a-zA-Z]+)/);
  if (!match) return { value: quantity };
  return {
    value: match[1].replace(',', '.'),
    unit: match[2].toLowerCase(),
  };
}

async function enrichWithOpenAI(draft: DetectionDraft, apiKey: string): Promise<DetectionDraft> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: 'You normalize grocery product metadata. Return strict JSON with keys: name, brand, quantityValue, unit, category, storage, storageDetail, notes, confidence, sources.',
        },
        {
          role: 'user',
          content: `Normalize this grocery product draft for inventory autofill: ${JSON.stringify(draft)}`,
        },
      ],
    }),
  });

  if (!response.ok) return { ...draft, sources: ['openfoodfacts'] };

  const jsonResponse = await response.json();
  const content = jsonResponse?.choices?.[0]?.message?.content;
  if (!content) return { ...draft, sources: ['openfoodfacts'] };

  try {
    const parsed = JSON.parse(content) as DetectionDraft;
    return {
      ...parsed,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.84,
      sources: Array.isArray(parsed.sources) ? parsed.sources : ['openai'],
    };
  } catch {
    return { ...draft, sources: ['openfoodfacts'] };
  }
}
