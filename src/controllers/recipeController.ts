import { Request, Response } from 'express';
import { getAllRecipesService, createRecipeService, updateRecipeService, deleteRecipeService } from '../services/recipeService';

export const getAllRecipes = async (req: Request, res: Response): Promise<void> => {
  const user_id = req.query.user_id as string | undefined;

  if (!user_id) {
    res.status(400).json({ error: 'Debes proporcionar un user_id para ver tus recetas.' });
    return;
  }

  try {
    const localRecipes = await getAllRecipesService(user_id);
    
    const formattedLocal = localRecipes.map(r => ({
      ...r,
      ingredients: r.ingredients.map(ri => ({
        name: ri.ingredient.name,
        quantity: ri.required_quantity,
        unit: ri.ingredient.unit_default,
        ingredient_id: ri.ingredient_id
      }))
    }));

    res.json({
      message: 'Recetas obtenidas (Próximamente incluirán las de la API externa)',
      recipes: formattedLocal 
    });

  } catch (error) {
    console.error('Error al obtener recetas:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

export const createRecipe = async (req: Request, res: Response): Promise<void> => {
  try {
    const newRecipe = await createRecipeService(req.body);
    res.status(201).json({ message: 'Receta creada exitosamente', recipeId: newRecipe.id });
  } catch (error) {
    console.error('Error al crear receta:', error);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
};

export const updateRecipe = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { user_id } = req.body;

  if (!user_id) {
    res.status(400).json({ error: 'Debes proporcionar el user_id para verificar que eres el autor.' });
    return;
  }

  try {
    await updateRecipeService(Number(id), req.body);
    res.json({ message: '¡Receta actualizada con éxito!' });
  } catch (error: any) {
    if (error.message.includes('No tienes permiso')) {
      res.status(403).json({ error: error.message });
      return;
    }
    console.error('Error al editar receta:', error);
    res.status(500).json({ error: 'Error al procesar la solicitud.' });
  }
};

export const deleteRecipe = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { user_id } = req.body;

  if (!user_id) {
    res.status(400).json({ error: 'Debes proporcionar el user_id para verificar que eres el autor.' });
    return;
  }

  try {
    await deleteRecipeService(Number(id), user_id);
    res.json({ message: 'Receta eliminada por completo.' });
  } catch (error: any) {
    if (error.message.includes('No tienes permiso')) {
      res.status(403).json({ error: error.message });
      return;
    }
    console.error('Error al eliminar receta:', error);
    res.status(500).json({ error: 'Error al procesar la solicitud.' });
  }
};