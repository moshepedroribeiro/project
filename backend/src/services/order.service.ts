import { v4 as uuidv4 } from 'uuid';

import { Order, OrderItem, OrderStatus } from '../models';
import { store } from '../store';
import { stockLock } from '../locks';
import { idempotencyCache } from '../cache';
import { processOrderWithERP } from '../workers';
import {
  ProductNotFoundError,
  InsufficientStockError,
} from '../errors';
import { CreateOrderInput } from '../validators/order.validator';

/**
 * OrderService — camada de regras de negócio para pedidos.
 *
 * Responsabilidades:
 * 1. Resolver produtos e montar snapshot de preços
 * 2. Reservar estoque atomicamente (via StockLock)
 * 3. Calcular total
 * 4. Persistir pedido com status PENDING
 * 5. Registrar no cache de idempotência
 * 6. Disparar processamento ERP em background (fire-and-forget)
 * 7. Consultar pedidos por ID (para polling)
 *
 * ⚠️ NÃO trata idempotência nem validação de input —
 *    essas são responsabilidades do Controller.
 */
export class OrderService {
  /**
   * Cria um pedido com reserva atômica de estoque
   * e dispara o processamento ERP em background.
   *
   * @throws ProductNotFoundError  — se algum productId não existe
   * @throws InsufficientStockError — se estoque é insuficiente
   */
  async createOrder(input: CreateOrderInput, idempotencyKey: string): Promise<Order> {
    const productIds = input.items.map((item) => item.productId);

    // ── 1. Executa dentro do lock dos produtos envolvidos ──
    const order = await stockLock.withLock(productIds, () => {
      // 2. Valida existência de todos os produtos
      const resolvedItems: OrderItem[] = [];
      for (const item of input.items) {
        const product = store.findProductById(item.productId);
        if (!product) {
          throw new ProductNotFoundError(item.productId);
        }

        resolvedItems.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: product.price, // snapshot do preço atual
        });
      }

      // 3. Reserva estoque atomicamente (tudo ou nada)
      const decremented: { productId: string; quantity: number }[] = [];

      try {
        for (const item of resolvedItems) {
          const product = store.findProductById(item.productId)!;

          if (product.stock < item.quantity) {
            throw new InsufficientStockError(
              item.productId,
              item.quantity,
              product.stock
            );
          }

          const success = store.decrementStock(item.productId, item.quantity);
          if (!success) {
            throw new InsufficientStockError(
              item.productId,
              item.quantity,
              product.stock
            );
          }

          decremented.push({
            productId: item.productId,
            quantity: item.quantity,
          });
        }
      } catch (error) {
        // Rollback: restaura estoque dos itens já decrementados
        for (const dec of decremented) {
          store.restoreStock(dec.productId, dec.quantity);
        }
        throw error;
      }

      // 4. Calcula total
      const total = resolvedItems.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0
      );

      // 5. Cria o pedido com status PENDING
      const newOrder: Order = {
        id: uuidv4(),
        customerId: input.customerId,
        items: resolvedItems,
        status: OrderStatus.PENDING,
        total,
        idempotencyKey,
        createdAt: new Date(),
      };

      store.saveOrder(newOrder);

      return newOrder;
    });

    // 6. Registra no cache de idempotência
    idempotencyCache.set(idempotencyKey, order);

    // ── 7. Dispara worker ERP em background (fire-and-forget) ──
    // O processamento NÃO bloqueia a resposta HTTP.
    // Erros do worker são logados mas não propagados ao cliente.
    processOrderWithERP(order.id).catch((err) => {
      console.error(
        `[ORDER-SERVICE] Erro não tratado no worker ERP para pedido ${order.id}:`,
        err
      );
    });

    return order;
  }

  /**
   * Busca um pedido por ID.
   * Usado pelo endpoint GET /orders/:id (polling).
   */
  getOrderById(id: string): Order | undefined {
    return store.findOrderById(id);
  }
}

/** Singleton */
export const orderService = new OrderService();
