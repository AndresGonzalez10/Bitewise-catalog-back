import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { getAllRecipesService, createRecipeService, updateRecipeService, deleteRecipeService,getMatchingRecipesService, getScaledRecipeService } from '../services/recipeService';
import { searchExternalRecipesService, getRandomExternalRecipesService, importExternalRecipeService } from '../services/externalRecipeService';

export const getAllRecipes = async (req: AuthRequest, res: Response): Promise<void> => {

  const user_id = req.user?.userId;

  if (!user_id) {
    res.status(401).json({ error: 'No autorizado. Debes iniciar sesión.' });
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

export const createRecipe = async (req: AuthRequest, res: Response): Promise<void> => {

  const author_id = req.user?.userId;
  const { title, instructions, image_url, ingredients } = req.body;

  if (!author_id || !title || !instructions) {
    res.status(400).json({ error: 'Faltan datos obligatorios (título o instrucciones).' });
    return;
  }

  if (ingredients && Array.isArray(ingredients)) {
    const hasInvalidQuantity = ingredients.some((ing: any) => Number(ing.required_quantity) <= 0);
    if (hasInvalidQuantity) {
      res.status(400).json({ error: 'Error matemático: La cantidad requerida de cada ingrediente debe ser mayor a cero.' });
      return;
    }
  }

  try {
    const newRecipe = await createRecipeService({ title, instructions, image_url, author_id, ingredients });
    res.status(201).json({ message: 'Receta creada exitosamente', recipeId: newRecipe.id });
  } catch (error) {
    console.error('Error al crear receta:', error);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
};

export const updateRecipe = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  // 👇 ID del token
  const user_id = req.user?.userId;
  const { title, instructions, image_url, ingredients } = req.body;

  if (!user_id) {
    res.status(401).json({ error: 'No autorizado. Debes iniciar sesión.' });
    return;
  }

  // 👇 BLINDAJE MATEMÁTICO
  if (ingredients && Array.isArray(ingredients)) {
    const hasInvalidQuantity = ingredients.some((ing: any) => Number(ing.required_quantity) <= 0);
    if (hasInvalidQuantity) {
      res.status(400).json({ error: 'Error matemático: La cantidad requerida de cada ingrediente debe ser mayor a cero.' });
      return;
    }
  }

  try {
    // Pasamos el user_id seguro
    await updateRecipeService(Number(id), { user_id, title, instructions, image_url, ingredients });
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

export const deleteRecipe = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  // 👇 ID del token
  const user_id = req.user?.userId;

  if (!user_id) {
    res.status(401).json({ error: 'No autorizado.' });
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

export const getMatch = async (req: AuthRequest, res: Response): Promise<void> => {
  const user_id = req.user?.userId;

  if (!user_id) {
    res.status(401).json({ error: 'No autorizado.' });
    return;
  }

  try {
    const matches = await getMatchingRecipesService(user_id);
    res.json({
      message: 'Match calculado exitosamente',
      data: matches
    });
  } catch (error) {
    console.error('Error al calcular el match:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

export const searchExternalRecipes = async (req: AuthRequest, res: Response): Promise<void> => {
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

export const getRandomExternalRecipes = async (req: AuthRequest, res: Response): Promise<void> => {
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

export const importExternalRecipe = async (req: AuthRequest, res: Response): Promise<void> => {
  const user_id = req.user?.userId;
  const { externalMeal } = req.body;

  if (!externalMeal || !user_id) {
    res.status(400).json({ error: 'Faltan datos: externalMeal es obligatorio o el token es inválido.' });
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
export const getRecipeById = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  // Capturamos el tamaño de porción que el usuario quiere ver desde la URL (?servings=3-4)
  const targetServings = req.query.servings as string | undefined;

  try {
    const recipe = await getScaledRecipeService(Number(id), targetServings);
    res.json({ message: 'Receta obtenida con éxito', recipe });
  } catch (error: any) {
    if (error.message === 'Receta no encontrada') {
      res.status(404).json({ error: error.message });
      return;
    }
    console.error('Error al obtener la receta:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};