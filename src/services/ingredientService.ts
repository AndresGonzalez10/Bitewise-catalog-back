import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createIngredientService = async (data: any) => {
  const { author_id, name, category, purchase_price, purchase_quantity, unit_default } = data;

  // Matemática limpia: Precio total / Cantidad comprada = Precio por unidad
  const calculatedUnitPrice = Number(purchase_price) / Number(purchase_quantity);

  return await prisma.ingredients.create({
    data: {
      author_id,
      name,
      category,
      unit_price: calculatedUnitPrice,
      unit_default: unit_default.toLowerCase()
    }
  });
};

export const updateIngredientService = async (id: number, data: any) => {
  const { user_id, name, category, purchase_price, purchase_quantity, unit_default } = data;

  const ingredient = await prisma.ingredients.findUnique({ where: { id } });
  if (!ingredient || ingredient.author_id !== user_id) {
    throw new Error('No tienes permiso para editar este ingrediente o no existe.');
  }

  // Recalculamos el precio en caso de que hayan cambiado los valores en el front
  const calculatedUnitPrice = Number(purchase_price) / Number(purchase_quantity);

  return await prisma.ingredients.update({
    where: { id },
    data: {
      name,
      category,
      unit_price: calculatedUnitPrice,
      unit_default: unit_default.toLowerCase()
    }
  });
};

export const getAllIngredientsService = async (userId?: string) => {
  return await prisma.ingredients.findMany({
    where: {
      OR: [
        { author_id: null }, 
        ...(userId ? [{ author_id: userId }] : []) 
      ]
    },
    orderBy: { name: 'asc' }
  });
};

export const searchIngredientsService = async (query: string, userId?: string) => {
  return await prisma.ingredients.findMany({
    where: {
      name: { contains: query, mode: 'insensitive' }, 
      OR: [
        { author_id: null },
        ...(userId ? [{ author_id: userId }] : [])
      ]
    },
    orderBy: { name: 'asc' },
    take: 20 
  });
};

export const deleteIngredientService = async (id: number, user_id: string) => {
  const ingredient = await prisma.ingredients.findUnique({ where: { id } });
  
  if (!ingredient || ingredient.author_id !== user_id) {
    throw new Error('No tienes permiso para eliminar este ingrediente o no existe.');
  }

  return await prisma.ingredients.delete({
    where: { id }
  });
};