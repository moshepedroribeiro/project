import { generateUUID } from '../utils';
import type { OrderResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333/api/v1';

interface CreateOrderPayload {
  customerId: string;
  items: { productId: string; quantity: number }[];
}

/**
 * Envia o pedido para a API com o header X-Idempotency-Key.
 *
 * O UUID é gerado no client-side para garantir que
 * retries ou double-clicks não criem pedidos duplicados.
 */
export async function createOrder(
  payload: CreateOrderPayload,
  idempotencyKey?: string
): Promise<OrderResponse> {
  const key = idempotencyKey ?? generateUUID();

  const response = await fetch(`${API_BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Idempotency-Key': key,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.error?.message || errorBody.message || `Erro ${response.status}: falha ao criar pedido`;
    const code = errorBody.error?.code || 'UNKNOWN_ERROR';
    const error = new Error(message);
    (error as any).code = code;
    throw error;
  }

  const responseData = await response.json();
  return responseData.data ?? responseData.order ?? responseData;
}

/**
 * Consulta o status de um pedido (polling).
 */
export async function getOrderStatus(orderId: string): Promise<OrderResponse> {
  const response = await fetch(`${API_BASE_URL}/orders/${orderId}`);

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.error?.message || errorBody.message || `Erro ao consultar pedido: ${response.status}`;
    const code = errorBody.error?.code || 'UNKNOWN_ERROR';
    const error = new Error(message);
    (error as any).code = code;
    throw error;
  }

  const payload = await response.json();
  return payload.data ?? payload.order ?? payload;
}
