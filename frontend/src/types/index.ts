/**
 * Tipos compartilhados do frontend — espelham os modelos do backend.
 */

export interface Product {
  id: string;
  name: string;
  /** Preço em centavos */
  price: number;
  stock: number;
  image: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface OrderResponse {
  id: string;
  customerId: string;
  items: { productId: string; quantity: number; unitPrice: number }[];
  status: OrderStatus;
  total: number;
  idempotencyKey: string;
  createdAt: string;
}

export interface CheckoutError {
  message: string;
  code?: string;
}
