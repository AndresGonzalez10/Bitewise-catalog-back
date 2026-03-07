import { Router } from 'express';
import { createIngredient, updateIngredient, getAllIngredients ,deleteIngredient} from '../controllers/ingredientController';
import { verifyToken } from '../middlewares/authMiddleware';

const router = Router();

router.get('/',verifyToken, getAllIngredients);
router.post('/',verifyToken, createIngredient);
router.put('/:id',verifyToken, updateIngredient);
router.delete('/:id', verifyToken,deleteIngredient);

export default router;