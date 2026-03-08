import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware'; 
import { createIngredientService, updateIngredientService, getAllIngredientsService, deleteIngredientService, searchIngredientsService } from '../services/ingredientService';

export const createIngredient = async (req: AuthRequest, res: Response): Promise<void> => {
  const author_id = req.user?.userId; 
  const { name, category, purchase_price, purchase_quantity, weight_per_unit, unit_default } = req.body;

  if (!author_id || !name || !category) {
    res.status(400).json({ error: 'Faltan datos obligatorios: name o category (o el token es inválido).' });
    return;
  }

  if (unit_default && !['g', 'ml'].includes(unit_default.toLowerCase())) {
    res.status(400).json({ error: 'El campo unit_default solo permite los valores "g" o "ml".' });
    return;
  }

  if (
    (purchase_price !== undefined && Number(purchase_price) < 0) ||
    (purchase_quantity !== undefined && Number(purchase_quantity) <= 0) ||
    (weight_per_unit !== undefined && Number(weight_per_unit) <= 0)
  ) {
    res.status(400).json({ error: 'Error matemático: Los precios no pueden ser negativos, y las cantidades o pesos deben ser mayores a cero.' });
    return;
  }

  try {
    const newIngredient = await createIngredientService({ 
      ...req.body, 
      unit_default: unit_default?.toLowerCase(), // Nos aseguramos de guardarlo en minúscula
      author_id 
    });
    res.status(201).json({
      message: 'Ingrediente creado. El precio por unidad fue calculado automáticamente.',
      ingredient: newIngredient
    });
  } catch (error: any) {
    if (error.code === 'P2002') { 
      res.status(400).json({ error: 'Ya existe un ingrediente con ese nombre en la base de datos.' });
      return;
    }
    console.error('Error al crear ingrediente:', error);
    res.status(500).json({ error: 'Error al procesar la solicitud.' });
  }
};

export const updateIngredient = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const user_id = req.user?.userId; 
  const { purchase_price, purchase_quantity, weight_per_unit, unit_default } = req.body;

  if (!user_id) {
    res.status(400).json({ error: 'No se pudo verificar tu identidad a partir del token.' });
    return;
  }

  if (unit_default && !['g', 'ml'].includes(unit_default.toLowerCase())) {
    res.status(400).json({ error: 'El campo unit_default solo permite los valores "g" o "ml".' });
    return;
  }

  if (
    (purchase_price !== undefined && Number(purchase_price) < 0) ||
    (purchase_quantity !== undefined && Number(purchase_quantity) <= 0) ||
    (weight_per_unit !== undefined && Number(weight_per_unit) <= 0)
  ) {
    res.status(400).json({ error: 'Error matemático: Valores inválidos.' });
    return;
  }

  try {
    const updatedIngredient = await updateIngredientService(Number(id), { 
      ...req.body, 
      unit_default: unit_default?.toLowerCase(),
      user_id 
    });
    res.json({
      message: 'Ingrediente actualizado correctamente con el nuevo costo por unidad.',
      ingredient: updatedIngredient
    });
  } catch (error: any) {
    if (error.message.includes('No tienes permiso')) {
      res.status(403).json({ error: error.message });
      return;
    }
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'El nuevo nombre ya está siendo usado por otro ingrediente.' });
      return;
    }
    console.error('Error al editar ingrediente:', error);
    res.status(500).json({ error: 'Error al procesar la solicitud.' });
  }
};

export const getAllIngredients = async (req: AuthRequest, res: Response): Promise<void> => {
  const user_id = req.user?.userId; 
  try {
    const ingredients = await getAllIngredientsService(user_id);
    res.json(ingredients);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener ingredientes' });
  }
};

export const searchIngredients = async (req: AuthRequest, res: Response): Promise<void> => {
  const user_id = req.user?.userId;
  const { q } = req.query; 

  if (!q || typeof q !== 'string') {
    res.status(400).json({ error: 'Falta el parámetro de búsqueda "?q=".' });
    return;
  }

  try {
    const ingredients = await searchIngredientsService(q, user_id);
    res.json(ingredients);
  } catch (error) {
    console.error('Error al buscar ingredientes:', error);
    res.status(500).json({ error: 'Error al buscar ingredientes.' });
  }
};

export const deleteIngredient = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  const user_id = req.user?.userId; 

  if (!user_id) {
    res.status(400).json({ error: 'No se pudo verificar tu identidad a partir del token.' });
    return;
  }

  try {
    await deleteIngredientService(id, user_id);
    res.json({ message: 'Ingrediente eliminado correctamente de tu catálogo.' });
  } catch (error: any) {
    if (error.message.includes('No tienes permiso')) {
      res.status(403).json({ error: error.message });
      return;
    }
    console.error('Error al eliminar ingrediente:', error);
    res.status(500).json({ error: 'Error al procesar la solicitud.' });
  }
};