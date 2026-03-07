import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createIngredientService = async (data: any) => {
  const { author_id, name, category, purchase_price, purchase_quantity, unit_default, weight_per_unit } = data;

  let calculatedUnitPrice = 0.05; 
  if (purchase_price !== undefined && purchase_quantity !== undefined && purchase_quantity > 0) {
    calculatedUnitPrice = Number(purchase_price) / Number(purchase_quantity);
  }

  return await prisma.ingredient.create({
    data: {
      author_id,
      name,
      category,
      unit_price: calculatedUnitPrice,
      unit_default: unit_default || 'g',
      weight_per_unit: Number(weight_per_unit) || 1.00
    }
  });
};

export const updateIngredientService = async (id: number, data: any) => {
  const { user_id, name, category, purchase_price, purchase_quantity, unit_default, weight_per_unit } = data;

  const ingredient = await prisma.ingredient.findUnique({ where: { id } });
  if (!ingredient || ingredient.author_id !== user_id) {
    throw new Error('No tienes permiso para editar este ingrediente o no existe.');
  }

  let calculatedUnitPrice = ingredient.unit_price; 
  if (purchase_price !== undefined && purchase_quantity !== undefined && purchase_quantity > 0) {
    calculatedUnitPrice = Number(purchase_price) / Number(purchase_quantity) as any;
  }

  return await prisma.ingredient.update({
    where: { id },
    data: {
      name: name || ingredient.name,
      category: category || ingredient.category,
      unit_price: calculatedUnitPrice,
      unit_default: unit_default || ingredient.unit_default,
      weight_per_unit: weight_per_unit !== undefined ? Number(weight_per_unit) : ingredient.weight_per_unit 
    }
  });
};

export const getAllIngredientsService = async (userId?: string) => {
  return await prisma.ingredient.findMany({
    where: {
      OR: [
        { author_id: null }, 
        ...(userId ? [{ author_id: userId }] : []) 
      ]
    },
    orderBy: { name: 'asc' }
  });
};

export const deleteIngredientService = async (id: number, user_id: string) => {

  const ingredient = await prisma.ingredient.findUnique({ where: { id } });
  

  if (!ingredient || ingredient.author_id !== user_id) {
    throw new Error('No tienes permiso para eliminar este ingrediente o no existe.');
  }


  return await prisma.ingredient.delete({
    where: { id }
  });
};