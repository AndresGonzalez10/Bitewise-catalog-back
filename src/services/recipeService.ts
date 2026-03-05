import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllRecipesService = async (userId: string) => {
  return await prisma.recipe.findMany({
    where: { author_id: userId },
    include: {
      ingredients: {
        include: { ingredient: true }
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