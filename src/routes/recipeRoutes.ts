import { Router } from 'express';
import { getAllRecipes, createRecipe, updateRecipe, deleteRecipe } from '../controllers/recipeController';

const router = Router();

router.get('/', getAllRecipes);
router.post('/', createRecipe);
router.put('/:id', updateRecipe);
router.delete('/:id', deleteRecipe);

export default router;