import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const API_KEY = process.env.THEMEALDB_API_KEY || '1'; 
const BASE_URL = process.env.THEMEALDB_BASE_URL || 'https://www.themealdb.com/api/json/v1/';

const ALLOWED_AREAS = ['Mexican', 'American', 'Canadian', 'Venezuelan', 'Argentinian'];

export interface ExternalMeal {
  idMeal: string;
  strMeal: string;
  strCategory: string;
  strArea: string;
  strMealThumb: string;
  strInstructions: string;
  [key: string]: string | null | undefined; 
}

export interface FormattedRecipe {
  id: string; 
  title: string;
  category: string;
  region: string;
  image_url: string;
  instructions: string;
  is_custom: boolean;
  servings: string | null; 
  ingredients: {
    name: string;
    original_name: string; 
    original_measure: string;
    quantity: number;
    unit: string;
  }[];
}

const TRANSLATIONS: Record<string, string> = {
  'Mexican': 'Mexicana',
  'American': 'Estadounidense',
  'Canadian': 'Canadiense',
  'Argentinian': 'Argentina',
  'Venezuelan': 'Venezolana',
  'Chicken': 'Pollo',
  'Beef': 'Res',
  'Vegetarian': 'Vegetariana',
  'Dessert': 'Postre',
  'Seafood': 'Mariscos'
};

const ESTIMATED_PRICES_EN: Record<string, number> = {
  'olive oil': 0.15, 'butter': 0.12, 'beef': 0.18, 'pork': 0.12, 'chicken': 0.08, 
  'sugar': 0.03, 'flour': 0.02, 'salt': 0.01, 'pepper': 0.15, 'soy sauce': 0.06,
  'milk': 0.03, 'cheese': 0.16, 'garlic': 0.10, 'onion': 0.03, 'tomato': 0.03,
  'potato': 0.03, 'water': 0.00
};

const getEstimatedPrice = (englishName: string): number => {
  const nameLower = englishName.toLowerCase();
  for (const [key, price] of Object.entries(ESTIMATED_PRICES_EN)) {
    if (nameLower.includes(key)) return price; 
  }
  return 0.04; 
};

const translateToSpanish = async (text: string): Promise<string> => {
  if (!text || text.trim() === '') return '';
  try {
    const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=es&dt=t&q=${encodeURIComponent(text)}`);
    const data = await response.json();
    return data[0].map((item: any) => item[0]).join('');
  } catch (error) {
    return text; 
  }
};

const normalizeMeasure = (measure: string): { quantity: number, unit: string } => {
  const lower = measure?.toLowerCase() || '';
  let amount = 1;
  const match = lower.match(/(\d+\s*\d*\/\d+|\d+\.\d+|\d+)/);
  
  if (match) {
    const val = match[1].trim();
    if (val.includes('/')) {
      const parts = val.split(' ');
      if (parts.length === 2) { 
        amount = parseFloat(parts[0]) + (parseFloat(parts[1].split('/')[0]) / parseFloat(parts[1].split('/')[1]));
      } else { 
        amount = parseFloat(val.split('/')[0]) / parseFloat(val.split('/')[1]);
      }
    } else {
      amount = parseFloat(val);
    }
  }

  let unit = 'g';
  let finalQuantity = amount;

  if (lower.includes('ml') || lower.includes('milliliter')) { unit = 'ml'; finalQuantity = amount; }
  else if (lower.includes('l') || lower.includes('liter') || lower.includes('water') || lower.includes('milk')) { unit = 'ml'; finalQuantity = amount * 1000; }
  else if (lower.includes('kg')) { unit = 'g'; finalQuantity = amount * 1000; }
  else if (lower.includes('g') && !lower.includes('garlic')) { unit = 'g'; finalQuantity = amount; }
  else if (lower.includes('lb') || lower.includes('pound')) { unit = 'g'; finalQuantity = amount * 453.59; }
  else if (lower.includes('oz') || lower.includes('ounce')) {
    if (lower.includes('fluid') || lower.includes('fl')) { unit = 'ml'; finalQuantity = amount * 29.57; }
    else { unit = 'g'; finalQuantity = amount * 28.35; }
  }
  else if (lower.includes('cup')) { unit = 'ml'; finalQuantity = amount * 240; } 
  else if (lower.includes('tbsp') || lower.includes('tablespoon')) { unit = 'g'; finalQuantity = amount * 15; }
  else if (lower.includes('tsp') || lower.includes('teaspoon')) { unit = 'g'; finalQuantity = amount * 5; }
  else if (lower.includes('pinch')) { unit = 'g'; finalQuantity = amount * 1; }
  else { 
    // NUEVO: Si la API dice "2", "1 clove", "1 whole", etc., lo tratamos como 'unidad'
    unit = 'unidad'; 
    finalQuantity = amount; 
  } 

  return { quantity: Number(finalQuantity.toFixed(2)), unit };
};

const formatRecipe = async (meal: ExternalMeal): Promise<FormattedRecipe> => {
  const translatedTitle = await translateToSpanish(meal.strMeal);
  const translatedInstructions = await translateToSpanish(meal.strInstructions);

  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const name = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];

    if (name && name.trim() !== '') {
      const norm = normalizeMeasure(measure || '');
      const translatedName = await translateToSpanish(name.trim()); 
      
      ingredients.push({
        name: translatedName, 
        original_name: name.trim(), 
        original_measure: measure ? measure.trim() : '',
        quantity: norm.quantity,
        unit: norm.unit 
      });
    }
  }

  return {
    id: meal.idMeal,
    title: translatedTitle, 
    category: TRANSLATIONS[meal.strCategory] || meal.strCategory,
    region: TRANSLATIONS[meal.strArea] || meal.strArea,
    image_url: meal.strMealThumb,
    instructions: translatedInstructions,
    is_custom: false, 
    servings: "2", 
    ingredients: ingredients
  };
};

export const searchExternalRecipesService = async (query: string): Promise<FormattedRecipe[]> => {
  const response = await fetch(`${BASE_URL}${API_KEY}/search.php?s=${query}`);
  if (!response.ok) throw new Error('Error al conectar');
  
  const data = await response.json();
  if (!data.meals) return [];

  const filteredMeals = data.meals.filter((meal: ExternalMeal) => ALLOWED_AREAS.includes(meal.strArea));
  return await Promise.all(filteredMeals.map((meal: ExternalMeal) => formatRecipe(meal)));
};

export const getRandomExternalRecipesService = async (): Promise<FormattedRecipe[]> => {
  const response = await fetch(`${BASE_URL}${API_KEY}/randomselection.php`);
  if (!response.ok) throw new Error('Error al conectar');
  
  const data = await response.json();
  if (!data.meals) return [];

  const filteredMeals = data.meals.filter((meal: ExternalMeal) => ALLOWED_AREAS.includes(meal.strArea));
  return await Promise.all(filteredMeals.map((meal: ExternalMeal) => formatRecipe(meal)));
};

export const getAllRegionalRecipesService = async (): Promise<FormattedRecipe[]> => {
  let fullRecipes: FormattedRecipe[] = [];

  for (const area of ALLOWED_AREAS) {
    const listResponse = await fetch(`${BASE_URL}${API_KEY}/filter.php?a=${area}`);
    if (!listResponse.ok) continue; 
    
    const listData = await listResponse.json();
    if (!listData.meals) continue;

    const topMeals = listData.meals.slice(0, 3); 

    for (const basicMeal of topMeals) {
      const detailResponse = await fetch(`${BASE_URL}${API_KEY}/lookup.php?i=${basicMeal.idMeal}`);
      const detailData = await detailResponse.json();
      
      if (detailData.meals && detailData.meals[0]) {
        fullRecipes.push(await formatRecipe(detailData.meals[0]));
      }
    }
  }

  return fullRecipes;
};

export const importExternalRecipeService = async (externalMeal: ExternalMeal, userId: string) => {
  const formatted = await formatRecipe(externalMeal);

  const ingredientMappings = await Promise.all(
    formatted.ingredients.map(async (ing) => {
      
      let localIng = await prisma.ingredient.findFirst({ 
        where: { 
            name: { equals: ing.name, mode: 'insensitive' },
            OR: [ { author_id: null }, { author_id: userId } ]
        } 
      });

      if (!localIng) {
        const smartPrice = getEstimatedPrice(ing.original_name); 

        localIng = await prisma.ingredient.create({
          data: {
            author_id: userId, 
            name: ing.name, 
            category: 'Importado',
            unit_price: smartPrice, 
            unit_default: ing.unit 
          }
        });
      }
      return { ingredient_id: localIng.id, quantity: ing.quantity };
    })
  );

  return await prisma.recipe.create({
    data: {
      title: formatted.title,
      instructions: formatted.instructions,
      image_url: formatted.image_url,
      author_id: userId, 
      is_custom: true,
      servings: "2", 
      ingredients: {
        create: ingredientMappings.map(map => ({
          ingredient_id: map.ingredient_id,
          required_quantity: map.quantity
        }))
      }
    }
  });
};