import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import ingredientRoutes from './routes/ingredientRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

app.use('/api/ingredients', ingredientRoutes);

app.listen(PORT, () => {
  console.log(`🍔 Servicio de Catálogo (Ingredientes) corriendo en http://localhost:${PORT}`);
});