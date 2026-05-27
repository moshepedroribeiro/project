import { Product, Order, OrderStatus } from '../models';

/**
 * In-Memory Store — simula banco de dados local.
 *
 * Em produção seria substituído por Redis/PostgreSQL,
 * mas a interface permaneceria a mesma (Repository Pattern).
 *
 * ⚠️ IMPORTANTE sobre concorrência:
 * Node.js é single-threaded no event loop, então operações
 * síncronas sobre o Map são naturalmente "atômicas" dentro
 * de um mesmo tick. O perigo real surge quando temos operações
 * assíncronas entre o "ler estoque" e o "decrementar estoque"
 * — por isso usamos o StockLock (ver stock-lock.ts).
 */
class InMemoryStore {
  private products: Map<string, Product> = new Map();
  private orders: Map<string, Order> = new Map();

  // ──────────────── PRODUCTS ────────────────

  seedProducts(products: Product[]): void {
    for (const p of products) {
      this.products.set(p.id, { ...p });
    }
  }

  findProductById(id: string): Product | undefined {
    const product = this.products.get(id);
    return product ? { ...product } : undefined;
  }

  getAllProducts(): Product[] {
    return Array.from(this.products.values()).map((p) => ({ ...p }));
  }

  /**
   * Decrementa estoque de forma síncrona.
   * Retorna `true` se o estoque era suficiente, `false` caso contrário.
   *
   * ⚠️ Esta operação DEVE ser chamada dentro do StockLock
   * para garantir atomicidade entre check-and-decrement.
   */
  decrementStock(productId: string, quantity: number): boolean {
    const product = this.products.get(productId);
    if (!product || product.stock < quantity) {
      return false;
    }
    product.stock -= quantity;
    return true;
  }

  /**
   * Restaura estoque (rollback em caso de falha parcial).
   */
  restoreStock(productId: string, quantity: number): void {
    const product = this.products.get(productId);
    if (product) {
      product.stock += quantity;
    }
  }

  // ──────────────── ORDERS ────────────────

  saveOrder(order: Order): void {
    this.orders.set(order.id, { ...order });
  }

  findOrderById(id: string): Order | undefined {
    const order = this.orders.get(id);
    return order ? { ...order } : undefined;
  }

  findOrderByIdempotencyKey(key: string): Order | undefined {
    for (const order of this.orders.values()) {
      if (order.idempotencyKey === key) {
        return { ...order };
      }
    }
    return undefined;
  }

  /**
   * Atualiza o status de um pedido.
   * Retorna `true` se o pedido foi encontrado e atualizado.
   *
   * Usado pelo ERP Worker para transicionar:
   *   PENDING → PROCESSING → COMPLETED | FAILED
   */
  updateOrderStatus(orderId: string, status: OrderStatus): boolean {
    const order = this.orders.get(orderId);
    if (!order) return false;

    order.status = status;
    return true;
  }
}

/** Singleton — compartilhado por toda a aplicação */
export const store = new InMemoryStore();
