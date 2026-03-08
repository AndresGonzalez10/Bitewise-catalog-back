import { Router } from 'express';
import { createIngredient, updateIngredient, getAllIngredients ,deleteIngredient, searchIngredients} from '../controllers/ingredientController';
import { verifyToken } from '../middlewares/authMiddleware';

const router = Router();

router.get('/',verifyToken, getAllIngredients);
router.post('/',verifyToken, createIngredient);
router.put('/:id',verifyToken, updateIngredient);
router.delete('/:id', verifyToken,deleteIngredient);
router.get('/search', verifyToken, searchIngredients);

export default router;