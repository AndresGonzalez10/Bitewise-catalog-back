import { Router } from 'express';
import { getAllRecipes, createRecipe, updateRecipe, deleteRecipe, getMatch, searchExternalRecipes,getRandomExternalRecipes,importExternalRecipe,getRecipeById, getAllRegionalRecipes} from '../controllers/recipeController';
import { verifyToken } from '../middlewares/authMiddleware';

const router = Router();

router.get('/match', verifyToken, getMatch);
router.get('/external/search', verifyToken, searchExternalRecipes);
router.get('/external/random', verifyToken, getRandomExternalRecipes);
router.get('/external/regional', verifyToken, getAllRegionalRecipes);
router.post('/external/import', verifyToken, importExternalRecipe);

router.get('/', verifyToken, getAllRecipes);
router.post('/', verifyToken, createRecipe);
router.get('/:id', verifyToken, getRecipeById); 
router.put('/:id', verifyToken, updateRecipe);
router.delete('/:id', verifyToken, deleteRecipe);

export default router;