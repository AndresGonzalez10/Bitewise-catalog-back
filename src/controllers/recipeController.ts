import { Request, Response } from 'express';
import { getAllRecipesService, createRecipeService, updateRecipeService, deleteRecipeService,getMatchingRecipesService } from '../services/recipeService';
import { searchExternalRecipesService, getRandomExternalRecipesService, importExternalRecipeService } from '../services/externalRecipeService';

export const getAllRecipes = async (req: Request, res: Response): Promise<void> => {
  const user_id = req.query.user_id as string | undefined;

  if (!user_id) {
    res.status(400).json({ error: 'Debes proporcionar un user_id para ver tus recetas.' });
    return;
  }

  try {
    const localRecipes = await getAllRecipesService(user_id);
    
    const formattedLocal = localRecipes.map((r: any) => ({
  ...r,
  ingredients: r.ingredients.map((ri: any) => ({ 
    name: ri.ingredient.name,
    quantity: ri.required_quantity,
    unit: ri.ingredient.unit_default,
    ingredient_id: ri.ingredient_id
  }))
}));

    res.json({
      message: 'Recetas obtenidas exitosamente',
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

export const getMatch = async (req: Request, res: Response): Promise<void> => {
  const { user_id } = req.params;

  if (!user_id) {
    res.status(400).json({ error: 'Falta el ID del usuario.' });
    return;
  }

  try {
    const matches = await getMatchingRecipesService(user_id as string);
    res.json({
      message: 'Match calculado exitosamente',
      data: matches
    });
  } catch (error) {
    console.error('Error al calcular el match:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

export const searchExternalRecipes = async (req: Request, res: Response): Promise<void> => {
  const { query } = req.query;
  
  if (!query) {
    res.status(400).json({ error: 'Debes proporcionar un término de búsqueda en el query param ?query=' });
    return;
  }

  try {
    const recipes = await searchExternalRecipesService(query as string);
    res.json({
      message: 'Recetas externas obtenidas con éxito',
      source: 'TheMealDB V2 Pro',
      count: recipes.length,
      recipes
    });
  } catch (error) {
    console.error('Error al buscar en API externa:', error);
    res.status(500).json({ error: 'Error al consultar el catálogo global.' });
  }
};

export const getRandomExternalRecipes = async (_req: Request, res: Response): Promise<void> => {
  try {
    const recipes = await getRandomExternalRecipesService();
    res.json({
      message: 'Sugerencias globales obtenidas con éxito',
      source: 'TheMealDB V2 Pro',
      count: recipes.length,
      recipes
    });
  } catch (error) {
    console.error('Error al obtener recetas aleatorias:', error);
    res.status(500).json({ error: 'Error al consultar el catálogo global.' });
  }
};

export const importExternalRecipe = async (req: Request, res: Response): Promise<void> => {
  const { externalMeal, user_id } = req.body;

  if (!externalMeal || !user_id) {
    res.status(400).json({ error: 'Faltan datos: externalMeal y user_id son obligatorios.' });
    return;
  }

  try {
    const newLocalRecipe = await importExternalRecipeService(externalMeal, user_id);
    res.status(201).json({
      message: '¡Receta importada a tu catálogo exitosamente!',
      recipe: newLocalRecipe
    });
  } catch (error) {
    console.error('Error al importar receta:', error);
    res.status(500).json({ error: 'Error al procesar la importación en la base de datos.' });
  }
};