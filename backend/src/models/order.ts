import { OrderStatus } from './enums';

/**
 * Item individual dentro de um pedido.
 */
export interface OrderItem {
  /** ID do produto referenciado */
  productId: string;

  /** Quantidade solicitada */
  quantity: number;

  /**
   * Preço unitário no momento da compra (snapshot).
   * Armazenado em centavos para evitar floating-point.
   * Garante que alterações futuras de preço não afetem pedidos já criados.
   */
  unitPrice: number;
}

/**
 * Representa um pedido armazenado localmente na aplicação da loja.
 *
 * ## Idempotência
 * O campo `idempotencyKey` é enviado pelo cliente e garante que
 * requisições duplicadas (retry, falha de rede, double-click)
 * não criem pedidos repetidos. O servidor rejeita (ou retorna
 * o pedido existente) se a chave já foi utilizada.
 *
 * ## Máquina de Estados (status)
 *
 * ```
 *   ┌─────────┐   evento criado    ┌────────────┐
 *   │ PENDING  │ ─────────────────► │ PROCESSING │
 *   └─────────┘                     └─────┬──────┘
 *                                         │
 *                              ┌──────────┴──────────┐
 *                              │                     │
 *                         sucesso ERP           falha ERP
 *                              │                     │
 *                              ▼                     ▼
 *                       ┌───────────┐          ┌────────┐
 *                       │ COMPLETED │          │ FAILED  │──┐
 *                       └───────────┘          └────────┘  │
 *                                                   ▲      │
 *                                                   │ retry │
 *                                                   └──────┘
 * ```
 *
 * - PENDING → PROCESSING:  um worker (ou consumer de fila) pega o pedido.
 * - PROCESSING → COMPLETED: o ERP confirmou a baixa de estoque.
 * - PROCESSING → FAILED: timeout / erro na comunicação com o ERP.
 * - FAILED → PROCESSING: mecanismo de retry (manual ou automático).
 */
export interface Order {
  /** Identificador único (UUID v4) */
  id: string;

  /** Identificador do cliente que realizou o pedido */
  customerId: string;

  /** Lista de itens do pedido */
  items: OrderItem[];

  /** Status atual — governado pela máquina de estados acima */
  status: OrderStatus;

  /**
   * Valor total do pedido em centavos.
   * Calculado como Σ (item.unitPrice × item.quantity).
   */
  total: number;

  /**
   * Chave de idempotência fornecida pelo cliente.
   * Deve ser única por pedido lógico (UUID v4 gerado no frontend).
   */
  idempotencyKey: string;

  /** Data de criação do pedido (ISO 8601) */
  createdAt: Date;
}

/**
 * DTO para criação de pedido — o cliente envia apenas
 * os itens e a chave de idempotência. O servidor calcula
 * total, status inicial (PENDING) e timestamps.
 */
export interface CreateOrderDTO {
  customerId: string;
  items: Pick<OrderItem, 'productId' | 'quantity'>[];
  idempotencyKey: string;
}
