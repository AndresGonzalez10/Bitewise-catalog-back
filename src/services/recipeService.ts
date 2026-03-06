import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();



export const getAllRecipesService = async (userId: string) => {
  return await prisma.recipe.findMany({
    where: {
      OR: [
        { is_custom: false },
        { author_id: userId }
      ]
    },
    include: {
      ingredients: { 
        include: { 
          ingredient: true 
        }
      }
    },
    orderBy: { id: 'asc' }
  });
};

export const createRecipeService = async (data: any) => {
  const { title, instructions, image_url, author_id, ingredients } = data;

  return await prisma.recipe.create({
    data: {
      title,
      instructions,
      image_url,
      author_id,
      is_custom: true, 
      ingredients: { 
        create: ingredients?.map((ing: any) => ({
          ingredient_id: ing.ingredient_id,
          required_quantity: ing.required_quantity
        })) || []
      }
    }
  });
};

export const updateRecipeService = async (id: number, data: any) => {
  const { user_id, title, instructions, image_url, ingredients } = data;

  const recipe = await prisma.recipe.findUnique({ where: { id } });
  if (!recipe || recipe.author_id !== user_id) {
    throw new Error('No tienes permiso para editar esta receta o no existe.');
  }

  return await prisma.recipe.update({
    where: { id },
    data: {
      title: title || recipe.title,
      instructions: instructions || recipe.instructions,
      image_url: image_url || recipe.image_url,
      ...(ingredients && {
        ingredients: {
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
  const recipe = await prisma.recipe.findUnique({ where: { id } });
  if (!recipe || recipe.author_id !== user_id) {
    throw new Error('No tienes permiso para eliminar esta receta o no existe.');
  }

  return await prisma.recipe.delete({ where: { id } });
};


export const getMatchingRecipesService = async (userId: string) => {

  const allRecipes = await prisma.recipe.findMany({
    where: {
      OR: [
        { is_custom: false },
        { author_id: userId }
      ]
    },
    include: {
      ingredients: { 
        include: { ingredient: true }
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

    const formattedIngredients = recipe.ingredients.map((ri: any) => {
      const userInvItem = userInventory.find((inv: any) => inv.ingredient_id === ri.ingredient_id);
      const userHas = userInvItem ? Number(userInvItem.current_quantity) : 0;
      const required = Number(ri.required_quantity);

if (userHas < required) {
    canCookPerfectly = false;
    const diff = required - userHas;
    
    const missingUnits = Math.ceil(diff / Number(ri.ingredient.weight_per_unit));

    missingIngredients.push({
        ingredient_id: ri.ingredient_id,
        name: ri.ingredient.name,
        missing_quantity: diff,
        missing_units: missingUnits, 
        unit: ri.ingredient.unit_default
    });
}

      return {
        ingredient_id: ri.ingredient_id,
        name: ri.ingredient.name,
        required_quantity: required,
        unit: ri.ingredient.unit_default,
        user_has_quantity: userHas
      };
    });

    const recipeData = {
      recipe_id: recipe.id,
      title: recipe.title,
      instructions: recipe.instructions,
      image_url: recipe.image_url,
      ingredients: formattedIngredients
    };

    if (recipe.ingredients.length > 0) {
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