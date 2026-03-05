import { Router } from 'express';
import { createIngredient, updateIngredient, getAllIngredients } from '../controllers/ingredientController';

const router = Router();

router.get('/', getAllIngredients);
router.post('/', createIngredient);
router.put('/:id', updateIngredient);

export default router;