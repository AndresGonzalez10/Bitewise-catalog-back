import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import ingredientRoutes from './routes/ingredientRoutes';
import recipeRoutes from './routes/recipeRoutes';



const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

app.use('/api/ingredients', ingredientRoutes);
app.use('/api/recipes', recipeRoutes);

app.listen(PORT as number, '0.0.0.0', () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});