import { Request, Response } from 'express';
import { createIngredientService, updateIngredientService, getAllIngredientsService } from '../services/ingredientService';

export const createIngredient = async (req: Request, res: Response): Promise<void> => {
  const { author_id, name, category } = req.body;

  if (!author_id || !name || !category) {
    res.status(400).json({ error: 'Faltan datos obligatorios: author_id, name o category.' });
    return;
  }

  try {
    const newIngredient = await createIngredientService(req.body);
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

export const updateIngredient = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { user_id } = req.body;

  if (!user_id) {
    res.status(400).json({ error: 'Debes proporcionar tu user_id para verificar que eres el creador.' });
    return;
  }

  try {
    const updatedIngredient = await updateIngredientService(Number(id), req.body);
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

export const getAllIngredients = async (_req: Request, res: Response): Promise<void> => {
  try {
    const ingredients = await getAllIngredientsService();
    res.json(ingredients);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener ingredientes' });
  }
};