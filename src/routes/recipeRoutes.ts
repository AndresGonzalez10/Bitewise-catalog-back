import { Router } from 'express';
import { getAllRecipes, createRecipe, updateRecipe, deleteRecipe, getMatch } from '../controllers/recipeController';

const router = Router();

router.get('/', getAllRecipes);
router.post('/', createRecipe);
router.put('/:id', updateRecipe);
router.delete('/:id', deleteRecipe);
router.get('/match/:user_id', getMatch);

export default router;