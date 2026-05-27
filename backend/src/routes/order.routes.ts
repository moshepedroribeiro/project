import { Router } from 'express';
import { orderController } from '../controllers';

const router = Router();

/**
 * POST /api/v1/orders
 *
 * Cria um novo pedido com reserva atômica de estoque.
 * Dispara processamento ERP em background.
 * Requer header X-Idempotency-Key.
 */
router.post(
  '/orders',
  (req, res, next) => orderController.create(req, res, next)
);

/**
 * GET /api/v1/orders/:id
 *
 * Consulta o status atual de um pedido (polling).
 * O status pode ser: PENDING → PROCESSING → COMPLETED | FAILED.
 */
router.get(
  '/orders/:id',
  (req, res, next) => orderController.findById(req, res, next)
);

export { router as orderRoutes };
