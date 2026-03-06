import { Router } from 'express';
import { getAllRecipes, createRecipe, updateRecipe, deleteRecipe, getMatch, searchExternalRecipes,getRandomExternalRecipes,importExternalRecipe } from '../controllers/recipeController';

const router = Router();

router.get('/', getAllRecipes);
router.post('/', createRecipe);
router.put('/:id', updateRecipe);
router.delete('/:id', deleteRecipe);
router.get('/match/:user_id', getMatch);
router.get('/external/search', searchExternalRecipes);
router.get('/external/random', getRandomExternalRecipes);
router.post('/external/import', importExternalRecipe);

export default router;