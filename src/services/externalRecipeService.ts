import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const API_KEY = process.env.THEMEALDB_API_KEY;
const BASE_URL = process.env.THEMEALDB_BASE_URL; 

const ALLOWED_AREAS = ['Mexican', 'American', 'Canadian', 'Venezuelan', 'Argentinian'];
const FORBIDDEN_INGREDIENTS = [
  'saffron', 'truffle', 'goose', 'venison', 'caviar', 'kangaroo', 
  'ostrich', 'garam masala', 'five spice', 'curry powder'
];

const convertToGrams = (measure: string, ingredientName: string): number => {
  const lowerMeasure = measure?.toLowerCase() || '';
  const match = lowerMeasure.match(/(\d+[\d\./]*)/); 
  const amount = match ? parseFloat(match[1]) : 1; 

  if (lowerMeasure.includes('kg')) return amount * 1000;
  if (lowerMeasure.includes('g') && !lowerMeasure.includes('garlic')) return amount;
  if (lowerMeasure.includes('lb')) return amount * 453; 
  if (lowerMeasure.includes('oz')) return amount * 28;  
  if (lowerMeasure.includes('quart')) return amount * 946;
  if (lowerMeasure.includes('cup')) return amount * 240; 
  if (lowerMeasure.includes('tbsp') || lowerMeasure.includes('tablespoon') || lowerMeasure.includes('tbs')) return amount * 15; 
  if (lowerMeasure.includes('tsp') || lowerMeasure.includes('teaspoon')) return amount * 5; 
  if (lowerMeasure.includes('clove')) return amount * 5; 
  if (lowerMeasure.includes('large') || lowerMeasure.includes('whole')) return amount * 150; 

  return amount * 50; 
};

const hasForbiddenIngredients = (meal: any): boolean => {
  for (let i = 1; i <= 20; i++) {
    const ingredient = meal[`strIngredient${i}`];
    if (ingredient) {
      if (FORBIDDEN_INGREDIENTS.some(forbidden => ingredient.toLowerCase().includes(forbidden))) {
        return true; 
      }
    }
  }
  return false; 
};

const TRANSLATIONS: { [key: string]: string } = {
  'Mexican': 'Mexicana',
  'American': 'Estadounidense',
  'Canadian': 'Canadiense',
  'Argentinian': 'Argentina',
  'Venezuelan': 'Venezolana',
  'Chicken': 'Pollo',
  'Beef': 'Res',
  'Vegetarian': 'Vegetariana'
};

const formatRecipe = (meal: any) => {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const name = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];

    if (name && name.trim() !== '') {
      ingredients.push({
        nombre: name.trim(), 
        medida_original: measure ? measure.trim() : '',
        gramos_estimados: convertToGrams(measure || '', name)
      });
    }
  }

  return {
    id_externo: meal.idMeal,
    titulo: meal.strMeal,
    categoria: TRANSLATIONS[meal.strCategory] || meal.strCategory,
    region: TRANSLATIONS[meal.strArea] || meal.strArea,
    imagen: meal.strMealThumb,
    instrucciones: meal.strInstructions,
    ingredientes: ingredients
  };
};


export const searchExternalRecipesService = async (query: string) => {
  const response = await fetch(`${BASE_URL}${API_KEY}/search.php?s=${query}`);
  if (!response.ok) throw new Error('Error al conectar con TheMealDB');
  
  const data = await response.json();
  if (!data.meals) return [];

  let filteredMeals = data.meals.filter((meal: any) => ALLOWED_AREAS.includes(meal.strArea));
  filteredMeals = filteredMeals.filter((meal: any) => !hasForbiddenIngredients(meal));

  return filteredMeals.map((meal: any) => formatRecipe(meal));
};

export const getRandomExternalRecipesService = async () => {
  const response = await fetch(`${BASE_URL}${API_KEY}/randomselection.php`);
  if (!response.ok) throw new Error('Error al conectar con TheMealDB');
  
  const data = await response.json();
  if (!data.meals) return [];

  let filteredMeals = data.meals.filter((meal: any) => ALLOWED_AREAS.includes(meal.strArea));
  filteredMeals = filteredMeals.filter((meal: any) => !hasForbiddenIngredients(meal));

  return filteredMeals.map((meal: any) => formatRecipe(meal));
};

export const getAllRegionalRecipesService = async () => {
  const AREAS = ['Mexican', 'Argentinian', 'American', 'Canadian', 'Venezuelan'];
  let allMeals: any[] = [];

  for (const area of AREAS) {
    const response = await fetch(`${BASE_URL}${API_KEY}/filter.php?a=${area}`);
    const data = await response.json();
    if (data.meals) {
      allMeals = [...allMeals, ...data.meals];
    }
  }

  return allMeals;
};

export const importExternalRecipeService = async (externalMeal: any, userId: string) => {
  const formatted = formatRecipe(externalMeal);

  const ingredientMappings = await Promise.all(
    formatted.ingredientes.map(async (ing: any) => {
      let localIng = await prisma.ingredient.findUnique({ where: { name: ing.nombre } });

      if (!localIng) {
        localIng = await prisma.ingredient.create({
          data: {
            name: ing.nombre,
            category: 'Importado',
            unit_price: 0.05, 
            weight_per_unit: 1.00 
          }
        });
      }
      return { ingredient_id: localIng.id, quantity: ing.gramos_estimados };
    })
  );

  return await prisma.recipe.create({
    data: {
      title: formatted.titulo,
      instructions: formatted.instrucciones,
      image_url: formatted.imagen,
      author_id: userId,
      is_custom: true,
      ingredients: {
        create: ingredientMappings.map(map => ({
          ingredient_id: map.ingredient_id,
          required_quantity: map.quantity
        }))
      }
    }
  });
};