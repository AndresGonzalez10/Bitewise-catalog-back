import { Router } from 'express';
import { createIngredient, updateIngredient, getAllIngredients ,deleteIngredient} from '../controllers/ingredientController';

const router = Router();

router.get('/', getAllIngredients);
router.post('/', createIngredient);
router.put('/:id', updateIngredient);
router.delete('/:id', deleteIngredient);

export default router;