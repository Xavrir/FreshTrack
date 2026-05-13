const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { inventory } = await req.json();
    const openAiKey = Deno.env.get('OPENAI_API_KEY');

    if (!Array.isArray(inventory) || inventory.length === 0) {
      return json({ menus: [] });
    }

    if (!openAiKey) {
      return json({ menus: buildFallbackMenus(inventory) });
    }

    const prompt = `Given this household inventory, recommend up to 3 menu ideas. Return strict JSON with shape {"menus":[{"id":"string","name":"string","description":"string","imageUri":"string","difficulty":"easy|medium|advanced","canCook":boolean,"matchScore":number,"prepTime":"string","servings":"string","summary":"string","ingredients":[{"name":"string","quantity":"string","have":"string","status":"enough|low|missing"}],"steps":["string"]}]}. Inventory: ${JSON.stringify(inventory)}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          { role: 'system', content: 'You generate recipe recommendations from inventory and must respond with strict JSON only.' },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      return json({ menus: buildFallbackMenus(inventory) });
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      return json({ menus: buildFallbackMenus(inventory) });
    }

    try {
      const parsed = JSON.parse(content);
      return json({ menus: parsed.menus ?? buildFallbackMenus(inventory) });
    } catch {
      return json({ menus: buildFallbackMenus(inventory) });
    }
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

function buildFallbackMenus(inventory: any[]) {
  const names = new Set(inventory.map((item) => String(item.name).toLowerCase()));
  const hasStrawberries = names.has('organic strawberries');
  const hasYogurt = names.has('greek yogurt');
  const hasSpinach = names.has('baby spinach');
  const hasOatMilk = names.has('oat milk');

  const menus = [];

  if (hasStrawberries && hasYogurt) {
    menus.push({
      id: 'berry-yogurt-breakfast-bowl',
      name: 'Berry Yogurt Breakfast Bowl',
      description: 'A quick breakfast bowl built from strawberries, yogurt, and oat milk with almost no prep.',
      imageUri: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=1200&q=80',
      difficulty: 'easy',
      canCook: true,
      matchScore: 94,
      prepTime: '5 MIN',
      servings: '2 CUPS',
      summary: 'This is the strongest match with what you already have: strawberries and yogurt are enough for two servings.',
      ingredients: [
        { name: 'Organic strawberries', quantity: '250 g', have: '450 g', status: 'enough' },
        { name: 'Greek yogurt', quantity: '1 cup', have: '3 cups', status: 'enough' },
        { name: 'Oat milk', quantity: '1/2 cup', have: hasOatMilk ? '1 carton' : '0 carton', status: hasOatMilk ? 'enough' : 'missing' },
      ],
      steps: ['Slice the strawberries.', 'Whisk yogurt and oat milk until smooth.', 'Top and serve cold.'],
    });
  }

  if (hasSpinach && hasStrawberries && hasOatMilk) {
    menus.push({
      id: 'creamy-green-smoothie',
      name: 'Creamy Green Smoothie',
      description: 'A simple smoothie that uses spinach, strawberries, yogurt, and oat milk to reduce waste before expiry.',
      imageUri: 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?auto=format&fit=crop&w=1200&q=80',
      difficulty: 'easy',
      canCook: true,
      matchScore: 91,
      prepTime: '8 MIN',
      servings: '2 GLASSES',
      summary: 'Excellent way to use the expiring yogurt and strawberries together while also clearing spinach from the drawer.',
      ingredients: [
        { name: 'Baby spinach', quantity: '1 cup', have: '1 bag', status: 'enough' },
        { name: 'Organic strawberries', quantity: '200 g', have: '450 g', status: 'enough' },
        { name: 'Oat milk', quantity: '1 cup', have: '1 carton', status: 'enough' },
      ],
      steps: ['Add all ingredients to a blender.', 'Blend until smooth.', 'Serve immediately.'],
    });
  }

  if (menus.length === 0) {
    menus.push({
      id: 'inventory-refresh-toast',
      name: 'Pantry Toast Plate',
      description: 'A flexible placeholder suggestion while your menu engine gathers more ingredients.',
      imageUri: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?auto=format&fit=crop&w=1200&q=80',
      difficulty: 'easy',
      canCook: false,
      matchScore: 55,
      prepTime: '10 MIN',
      servings: '1 PLATE',
      summary: 'Scan a few more pantry staples to unlock stronger menu matches.',
      ingredients: [{ name: 'Bread', quantity: '2 slices', have: '0 slices', status: 'missing' }],
      steps: ['Add more ingredients to inventory.', 'Re-run menu recommendations.', 'Choose a recipe with enough stock.'],
    });
  }

  return menus;
}
