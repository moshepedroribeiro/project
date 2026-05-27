import express from 'express';
import cors from 'cors';
import { orderRoutes } from './routes';
import { errorHandler } from './middlewares';
import { seedDatabase } from './seed';

const app = express();
const PORT = process.env.PORT ?? 3333;

// ── Middlewares globais ──
app.use(cors());
app.use(express.json());

// ── Health check ──
app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Rotas ──
app.use('/api/v1', orderRoutes);

// ── Error handler (deve ser o último middleware) ──
app.use(errorHandler);

// ── Seed & Start ──
seedDatabase();

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📦 POST http://localhost:${PORT}/api/v1/orders`);
    console.log(`🔍 GET  http://localhost:${PORT}/api/v1/orders/:id`);
    console.log(`❤️  GET  http://localhost:${PORT}/api/v1/health\n`);
  });
}

export { app };
