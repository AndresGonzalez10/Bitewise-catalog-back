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
  servings: null; 
  ingredients: {
    name: string;
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
  'Vegetarian': 'Vegetariana'
};

const convertToGrams = (measure: string, ingredientName: string): number => {
  const lowerMeasure = measure?.toLowerCase() || '';
  const match = lowerMeasure.match(/(\d+[\d\./]*)/); 
  const amount = match ? parseFloat(match[1]) : 1; 

  if (lowerMeasure.includes('kg')) return amount * 1000;
  if (lowerMeasure.includes('g') && !lowerMeasure.includes('garlic')) return amount;
  if (lowerMeasure.includes('lb')) return amount * 453; 
  if (lowerMeasure.includes('oz')) return amount * 28;  
  if (lowerMeasure.includes('cup')) return amount * 240; 
  if (lowerMeasure.includes('tbsp') || lowerMeasure.includes('tbs')) return amount * 15; 
  if (lowerMeasure.includes('tsp')) return amount * 5; 
  if (lowerMeasure.includes('clove')) return amount * 5; 

  return amount * 50; 
};

const formatRecipe = (meal: ExternalMeal): FormattedRecipe => {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const name = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];

    if (name && name.trim() !== '') {
      ingredients.push({
        name: name.trim(), 
        original_measure: measure ? measure.trim() : '',
        quantity: convertToGrams(measure || '', name),
        unit: 'g' 
      });
    }
  }

  return {
    id: meal.idMeal,
    title: meal.strMeal,
    category: TRANSLATIONS[meal.strCategory] || meal.strCategory,
    region: TRANSLATIONS[meal.strArea] || meal.strArea,
    image_url: meal.strMealThumb,
    instructions: meal.strInstructions,
    is_custom: false, 
    servings: null, 
    ingredients: ingredients
  };
};

export const searchExternalRecipesService = async (query: string): Promise<FormattedRecipe[]> => {
  const response = await fetch(`${BASE_URL}${API_KEY}/search.php?s=${query}`);
  if (!response.ok) throw new Error('Error al conectar con el proveedor externo');
  
  const data = await response.json();
  if (!data.meals) return [];

  const filteredMeals = data.meals.filter((meal: ExternalMeal) => ALLOWED_AREAS.includes(meal.strArea));
  return filteredMeals.map((meal: ExternalMeal) => formatRecipe(meal));
};

export const getRandomExternalRecipesService = async (): Promise<FormattedRecipe[]> => {
  const response = await fetch(`${BASE_URL}${API_KEY}/randomselection.php`);
  if (!response.ok) throw new Error('Error al conectar con el proveedor externo');
  
  const data = await response.json();
  if (!data.meals) return [];

  const filteredMeals = data.meals.filter((meal: ExternalMeal) => ALLOWED_AREAS.includes(meal.strArea));
  return filteredMeals.map((meal: ExternalMeal) => formatRecipe(meal));
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
        fullRecipes.push(formatRecipe(detailData.meals[0]));
      }
    }
  }

  return fullRecipes;
};
export const importExternalRecipeService = async (externalMeal: ExternalMeal, userId: string) => {
  const formatted = formatRecipe(externalMeal);

  const ingredientMappings = await Promise.all(
    formatted.ingredients.map(async (ing: { name: string; quantity: number }) => {
      let localIng = await prisma.ingredient.findUnique({ where: { name: ing.name } });

      if (!localIng) {
        localIng = await prisma.ingredient.create({
          data: {
            name: ing.name, 
            category: 'Importado',
            unit_price: 0.05, 
            weight_per_unit: 1.00 
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
      servings: null, 
      ingredients: {

        create: ingredientMappings.map((map: { ingredient_id: number; quantity: number }) => ({
          ingredient_id: map.ingredient_id,
          required_quantity: map.quantity
        }))
      }
    }
  });
};