import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

import { CreateOrderSchema } from '../validators/order.validator';
import { idempotencyCache } from '../cache';
import { orderService } from '../services';
import {
  AppError,
  MissingIdempotencyKeyError,
  OrderNotFoundError,
  ValidationError,
} from '../errors';

/**
 * OrderController — camada HTTP para pedidos.
 *
 * Responsabilidades:
 * - POST /orders: Criar pedido (idempotência + validação + estoque)
 * - GET /orders/:id: Consultar status do pedido (polling)
 *
 * ─────────────────────────────────────────────────────────
 * NOTA SOBRE ATOMICIDADE DE ESTOQUE EM PRODUÇÃO (Redis)
 * ─────────────────────────────────────────────────────────
 *
 * Em um cenário real com múltiplas instâncias da aplicação,
 * o mutex em memória (StockLock) NÃO seria suficiente.
 * A abordagem correta com Redis seria:
 *
 * 1. **DECRBY atômico**:
 *    ```
 *    local stock = redis.call('DECRBY', KEYS[1], ARGV[1])
 *    if stock < 0 then
 *      redis.call('INCRBY', KEYS[1], ARGV[1])  -- rollback
 *      return -1  -- estoque insuficiente
 *    end
 *    return stock
 *    ```
 *    Este Lua script roda atomicamente no Redis (single-threaded),
 *    eliminando qualquer race condition. O DECRBY decrementa
 *    e verifica em uma única operação atômica.
 *
 * 2. **WATCH/MULTI/EXEC** (optimistic locking):
 *    ```
 *    WATCH stock:{productId}
 *    stock = GET stock:{productId}
 *    if stock < quantity → ABORT
 *    MULTI
 *      DECRBY stock:{productId} quantity
 *    EXEC  // retorna null se outro cliente alterou → retry
 *    ```
 *
 * 3. **Redlock** para locks distribuídos quando a operação
 *    envolve múltiplos recursos (vários produtos no pedido).
 *
 * A implementação atual com StockLock é um análogo funcional
 * correto para single-instance (como neste desafio).
 * ─────────────────────────────────────────────────────────
 */
export class OrderController {
  /**
   * POST /api/v1/orders
   *
   * Headers:
   *   X-Idempotency-Key: <uuid> (obrigatório)
   *
   * Body:
   *   { customerId: string, items: [{ productId, quantity }] }
   *
   * Responses:
   *   201 — Pedido criado com sucesso (status: PENDING)
   *   200 — Pedido já existia (idempotência)
   *   400 — Validação falhou ou header ausente
   *   404 — Produto não encontrado
   *   409 — Estoque insuficiente
   *   500 — Erro interno
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // ── 1. Extrair e validar X-Idempotency-Key ──
      const idempotencyKey = req.headers['x-idempotency-key'];

      if (!idempotencyKey || typeof idempotencyKey !== 'string') {
        throw new MissingIdempotencyKeyError();
      }

      // ── 2. Verificar cache de idempotência (fast-path) ──
      const cachedOrder = idempotencyCache.get(idempotencyKey);

      if (cachedOrder) {
        res.status(200).json({
          success: true,
          message: 'Pedido já processado (idempotência)',
          data: cachedOrder,
          _meta: { idempotent: true },
        });
        return;
      }

      // ── 3. Validar payload com Zod ──
      const parseResult = CreateOrderSchema.safeParse(req.body);

      if (!parseResult.success) {
        throw new ValidationError(
          'Payload inválido',
          formatZodErrors(parseResult.error)
        );
      }

      const input = parseResult.data;

      // ── 4. Delegar criação ao service ──
      //       O service dispara o worker ERP em background (fire-and-forget)
      const order = await orderService.createOrder(input, idempotencyKey);

      // ── 5. Retornar resposta HTTP ──
      res.status(201).json({
        success: true,
        message: 'Pedido criado com sucesso — processamento assíncrono iniciado',
        data: order,
        _meta: { idempotent: false },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/orders/:id
   *
   * Endpoint de polling para o frontend consultar o status
   * atualizado de um pedido durante o processamento ERP.
   *
   * Responses:
   *   200 — Pedido encontrado
   *   400 — ID inválido (vazio)
   *   404 — Pedido não encontrado
   *   500 — Erro interno
   */
  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!id || !id.trim()) {
        throw new ValidationError('ID do pedido é obrigatório', {
          id: ['Parâmetro id não pode ser vazio'],
        });
      }

      const order = orderService.getOrderById(id);

      if (!order) {
        throw new OrderNotFoundError(id);
      }

      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }
}

/**
 * Formata erros do Zod em um formato amigável para a API.
 */
function formatZodErrors(error: ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_root';
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(issue.message);
  }

  return formatted;
}

/** Singleton */
export const orderController = new OrderController();
