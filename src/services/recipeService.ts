import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllRecipesService = async (userId: string) => {
  const recipes = await prisma.recipes.findMany({
    where: {
      OR: [
        { is_custom: false },
        { author_id: userId }
      ]
    },
    include: {
      recipe_ingredients: { 
        include: { 
          ingredients: true 
        }
      }
    },
    orderBy: { id: 'asc' }
  });

  // PROTECCIÓN FRONTEND: Mapeamos `recipe_ingredients` de vuelta a `ingredients`
  return recipes.map(recipe => ({
    ...recipe,
    ingredients: recipe.recipe_ingredients.map(ri => ({
      ...ri,
      ingredient: ri.ingredients
    }))
  }));
};

export const createRecipeService = async (data: any) => {
  const { title, instructions, image_url, author_id, ingredients, servings } = data; 

  return await prisma.recipes.create({
    data: {
      title,
      instructions,
      image_url,
      author_id,
      is_custom: true, 
      servings: servings || '1-2', 
      recipe_ingredients: { 
        create: ingredients?.map((ing: any) => ({
          ingredient_id: ing.ingredient_id,
          required_quantity: ing.required_quantity
        })) || []
      }
    }
  });
};

export const updateRecipeService = async (id: number, data: any) => {
  const { user_id, title, instructions, image_url, ingredients, servings } = data;

  const recipe = await prisma.recipes.findUnique({ where: { id } });
  if (!recipe || recipe.author_id !== user_id) {
    throw new Error('No tienes permiso para editar esta receta o no existe.');
  }

  return await prisma.recipes.update({
    where: { id },
    data: {
      title: title || recipe.title,
      instructions: instructions || recipe.instructions,
      image_url: image_url || recipe.image_url,
      servings: servings || recipe.servings, 
      ...(ingredients && {
        recipe_ingredients: {
          deleteMany: {}, 
          create: ingredients.map((ing: any) => ({ 
            ingredient_id: ing.ingredient_id,
            required_quantity: ing.required_quantity
          }))
        }
      })
    }
  });
};

export const deleteRecipeService = async (id: number, user_id: string) => {
  const recipe = await prisma.recipes.findUnique({ where: { id } });
  if (!recipe || recipe.author_id !== user_id) {
    throw new Error('No tienes permiso para eliminar esta receta o no existe.');
  }

  return await prisma.recipes.delete({ where: { id } });
};

export const getMatchingRecipesService = async (userId: string) => {

  const allRecipes = await prisma.recipes.findMany({
    where: {
      OR: [
        { is_custom: false },
        { author_id: userId }
      ]
    },
    include: {
      recipe_ingredients: { 
        include: { ingredients: true }
      }
    }
  });

  const userInventory = await prisma.inventory.findMany({
    where: { user_id: userId }
  });

  const perfectMatch: any[] = [];
  const partialMatch: any[] = [];

  allRecipes.forEach((recipe: any) => {
    let canCookPerfectly = true;
    const missingIngredients: any[] = [];

    const formattedIngredients = recipe.recipe_ingredients.map((ri: any) => {
      const userInvItem = userInventory.find((inv: any) => inv.ingredient_id === ri.ingredient_id);
      const userHas = userInvItem ? Number(userInvItem.current_quantity) : 0;
      const required = Number(ri.required_quantity);

      if (userHas < required) {
        canCookPerfectly = false;
        const diff = required - userHas;
        
        const missingUnits = Math.ceil(diff);

        missingIngredients.push({
            ingredient_id: ri.ingredient_id,
            name: ri.ingredients.name,
            missing_quantity: diff,
            missing_units: missingUnits, 
            unit: ri.ingredients.unit_default
        });
      }

      return {
        ingredient_id: ri.ingredient_id,
        name: ri.ingredients.name,
        required_quantity: required,
        unit: ri.ingredients.unit_default,
        user_has_quantity: userHas
      };
    });

    const recipeData = {
      recipe_id: recipe.id,
      title: recipe.title,
      instructions: recipe.instructions,
      image_url: recipe.image_url,
      ingredients: formattedIngredients // El frontend recibe 'ingredients' como esperaba
    };

    if (recipe.recipe_ingredients.length > 0) {
      if (canCookPerfectly) {
        perfectMatch.push(recipeData);
      } else {
        partialMatch.push({
          ...recipeData,
          missing_ingredients: missingIngredients
        });
      }
    }
  });

  return { perfectMatch, partialMatch };
};

export const getScaledRecipeService = async (id: number, targetServings?: string) => {
  const recipe = await prisma.recipes.findUnique({
    where: { id },
    include: {
      recipe_ingredients: {
        include: { ingredients: true }
      }
    }
  });

  if (!recipe) throw new Error('Receta no encontrada');

  if (!targetServings || targetServings === recipe.servings) {
    // Si no escala, igual mapeamos para el frontend
    return {
      ...recipe,
      ingredients: recipe.recipe_ingredients.map((ri: any) => ({
        ...ri,
        ingredient: ri.ingredients
      }))
    };
  }

  const servingLevels: Record<string, number> = {
    "1-2": 1,
    "3-4": 2,
    "5-6": 3,
    "7-8": 4
  };

  const baseLevel = servingLevels[recipe.servings || "1-2"];
  const targetLevel = servingLevels[targetServings];

  if (!targetLevel) return recipe;

  const multiplier = targetLevel / baseLevel;

  const scaledRecipe = {
    ...recipe,
    viewing_servings: targetServings, 
    ingredients: recipe.recipe_ingredients.map((ri: any) => ({
      ...ri,
      required_quantity: Number(ri.required_quantity) * multiplier, 
      ingredient: ri.ingredients
    }))
  };

  return scaledRecipe;
};