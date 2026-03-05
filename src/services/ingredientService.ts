import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createIngredientService = async (data: any) => {
  const { author_id, name, category, purchase_price, purchase_quantity, unit_default } = data;

  let calculatedUnitPrice = 0.05; 
  if (purchase_price !== undefined && purchase_quantity !== undefined && purchase_quantity > 0) {
    calculatedUnitPrice = purchase_price / purchase_quantity;
  }

  return await prisma.ingredient.create({
    data: {
      author_id,
      name,
      category,
      unit_price: calculatedUnitPrice,
      unit_default: unit_default || 'g'
    }
  });
};

export const updateIngredientService = async (id: number, data: any) => {
  const { user_id, name, category, purchase_price, purchase_quantity, unit_default } = data;

  const ingredient = await prisma.ingredient.findUnique({ where: { id } });
  if (!ingredient || ingredient.author_id !== user_id) {
    throw new Error('No tienes permiso para editar este ingrediente o no existe.');
  }

  let calculatedUnitPrice = ingredient.unit_price; 
  if (purchase_price !== undefined && purchase_quantity !== undefined && purchase_quantity > 0) {
    calculatedUnitPrice = purchase_price / purchase_quantity as any;
  }

  return await prisma.ingredient.update({
    where: { id },
    data: {
      name: name || ingredient.name,
      category: category || ingredient.category,
      unit_price: calculatedUnitPrice,
      unit_default: unit_default || ingredient.unit_default
    }
  });
};

export const getAllIngredientsService = async () => {
  return await prisma.ingredient.findMany({
    orderBy: { name: 'asc' }
  });
};