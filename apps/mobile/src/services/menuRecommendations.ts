import { MOCK_INVENTORY, type MockInventoryItem } from '../data/mockInventory';
import { isSupabaseConfigured, supabase } from './supabase';

export interface MenuIngredient {
  name: string;
  quantity: string;
  have: string;
  status: 'enough' | 'low' | 'missing';
}

export interface MenuRecommendation {
  id: string;
  name: string;
  description: string;
  imageUri: string;
  difficulty: 'easy' | 'medium' | 'advanced';
  canCook: boolean;
  matchScore: number;
  prepTime: string;
  servings: string;
  ingredients: MenuIngredient[];
  steps: string[];
  summary: string;
}

const FALLBACK_MENUS: MenuRecommendation[] = [
  {
    id: 'nasi-goreng-fridge-cleanout',
    name: 'Nasi Goreng',
    description: 'Savory fried rice using spinach, yogurt marinade, and pantry staples for a flexible weeknight meal.',
    imageUri: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=80',
    difficulty: 'easy',
    canCook: false,
    matchScore: 78,
    prepTime: '20 MIN',
    servings: '2 BOWLS',
    summary: 'You have the produce base and dairy elements, but still need cooked rice, egg, and soy sauce for a full nasi goreng.',
    ingredients: [
      { name: 'Cooked rice', quantity: '2 cups', have: '0 cups', status: 'missing' },
      { name: 'Egg', quantity: '2 pcs', have: '0 pcs', status: 'missing' },
      { name: 'Baby spinach', quantity: '1/2 bag', have: '1 bag', status: 'enough' },
      { name: 'Greek yogurt', quantity: '2 tbsp', have: '3 cups', status: 'enough' },
      { name: 'Soy sauce', quantity: '2 tbsp', have: '0 tbsp', status: 'missing' },
    ],
    steps: [
      'Warm a pan and scramble the eggs first, then set them aside.',
      'Stir-fry spinach with any aromatics you have until lightly wilted.',
      'Add cooked rice, soy sauce, and yogurt for a savory, creamy coating.',
      'Fold eggs back in and finish with sliced strawberries on the side for contrast.',
    ],
  },
  {
    id: 'berry-yogurt-breakfast-bowl',
    name: 'Berry Yogurt Breakfast Bowl',
    description: 'A quick breakfast bowl built from strawberries, yogurt, and oat milk with almost no prep.',
    imageUri: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=1200&q=80',
    difficulty: 'easy',
    canCook: true,
    matchScore: 94,
    prepTime: '5 MIN',
    servings: '2 CUPS',
    summary: 'This is the strongest match with what you already have: strawberries, yogurt, and oat milk are enough for two servings.',
    ingredients: [
      { name: 'Organic strawberries', quantity: '250 g', have: '450 g', status: 'enough' },
      { name: 'Greek yogurt', quantity: '1 cup', have: '3 cups', status: 'enough' },
      { name: 'Oat milk', quantity: '1/2 cup', have: '1 carton', status: 'enough' },
      { name: 'Honey or sweetener', quantity: '1 tbsp', have: 'optional', status: 'low' },
    ],
    steps: [
      'Slice the strawberries and reserve a few pieces for topping.',
      'Whisk yogurt and oat milk until smooth and spoon into bowls.',
      'Top with strawberries and any sweetener or granola you have available.',
      'Serve cold immediately as a quick breakfast or snack.',
    ],
  },
  {
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
      { name: 'Greek yogurt', quantity: '1/2 cup', have: '3 cups', status: 'enough' },
      { name: 'Oat milk', quantity: '1 cup', have: '1 carton', status: 'enough' },
    ],
    steps: [
      'Add oat milk and yogurt to the blender first.',
      'Add spinach and strawberries and blend until fully smooth.',
      'Taste and adjust thickness with more oat milk if needed.',
      'Pour into two glasses and serve immediately.',
    ],
  },
];

export function getFallbackMenuRecommendations(_inventory: MockInventoryItem[] = MOCK_INVENTORY) {
  return FALLBACK_MENUS;
}

export function getFallbackMenuRecommendationById(id: string) {
  return FALLBACK_MENUS.find((menu) => menu.id === id);
}

interface RecommendMenusParams {
  householdId?: string;
  inventory?: MockInventoryItem[];
}

export async function recommendMenus({ householdId, inventory = MOCK_INVENTORY }: RecommendMenusParams): Promise<MenuRecommendation[]> {
  if (!isSupabaseConfigured || !householdId) {
    return getFallbackMenuRecommendations(inventory);
  }

  const { data, error } = await supabase.functions.invoke('recommend-menus', {
    body: {
      household_id: householdId,
      inventory: inventory.map((item) => ({
        name: item.name,
        brand: item.brand,
        quantityValue: item.quantityValue,
        unit: item.unit,
        qtyLabel: item.qtyLabel,
        category: item.category,
        expiryIso: item.expiryIso,
      })),
    },
  });

  if (error) {
    return getFallbackMenuRecommendations(inventory);
  }

  const menus = data?.menus as MenuRecommendation[] | undefined;
  return menus?.length ? menus : getFallbackMenuRecommendations(inventory);
}
