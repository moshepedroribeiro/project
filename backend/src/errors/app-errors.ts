/**
 * Erros de domínio tipados — permitem que o controller
 * diferencie o tipo de falha e retorne o HTTP status correto.
 */

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly details: unknown
  ) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class IdempotencyConflictError extends AppError {
  constructor(message = 'Requisição duplicada — retornando resultado anterior') {
    super(message, 200, 'IDEMPOTENCY_HIT');
    this.name = 'IdempotencyConflictError';
  }
}

export class ProductNotFoundError extends AppError {
  constructor(productId: string) {
    super(`Produto não encontrado: ${productId}`, 404, 'PRODUCT_NOT_FOUND');
    this.name = 'ProductNotFoundError';
  }
}

export class InsufficientStockError extends AppError {
  constructor(productId: string, requested: number, available: number) {
    super(
      `Estoque insuficiente para o produto ${productId}: solicitado=${requested}, disponível=${available}`,
      409,
      'INSUFFICIENT_STOCK'
    );
    this.name = 'InsufficientStockError';
  }
}

export class MissingIdempotencyKeyError extends AppError {
  constructor() {
    super(
      'Header X-Idempotency-Key é obrigatório',
      400,
      'MISSING_IDEMPOTENCY_KEY'
    );
    this.name = 'MissingIdempotencyKeyError';
  }
}

export class OrderNotFoundError extends AppError {
  constructor(orderId: string) {
    super(`Pedido não encontrado: ${orderId}`, 404, 'ORDER_NOT_FOUND');
    this.name = 'OrderNotFoundError';
  }
}
