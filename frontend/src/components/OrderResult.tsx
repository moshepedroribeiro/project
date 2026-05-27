import type { OrderResponse, CheckoutError } from '../types';
import { formatCurrency } from '../utils';

interface OrderResultProps {
  order: OrderResponse | null;
  error: CheckoutError | null;
  onReset: () => void;
}

/**
 * Modal overlay exibido após o checkout.
 * Mostra sucesso com detalhes do pedido ou mensagem de erro com retry.
 */
export function OrderResult({ order, error, onReset }: OrderResultProps) {
  if (!order && !error) return null;

  return (
    <div className="modal-overlay" onClick={onReset}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {order ? (
          <>
            {/* Sucesso */}
            <div className="modal-icon modal-icon--success">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2 className="modal-title">Pedido Criado!</h2>
            <p className="modal-subtitle">Seu pedido está sendo processado</p>

            <div className="order-details">
              <div className="order-detail-row">
                <span className="order-detail-label">ID do Pedido</span>
                <span className="order-detail-value order-detail-value--mono">
                  {order.id.slice(0, 8)}...
                </span>
              </div>
              <div className="order-detail-row">
                <span className="order-detail-label">Status</span>
                <span className={`order-status order-status--${order.status.toLowerCase()}`}>
                  {order.status}
                </span>
              </div>
              <div className="order-detail-row">
                <span className="order-detail-label">Total</span>
                <span className="order-detail-value order-detail-value--highlight">
                  {formatCurrency(order.total)}
                </span>
              </div>
              <div className="order-detail-row">
                <span className="order-detail-label">Itens</span>
                <span className="order-detail-value">{order.items.length}</span>
              </div>
              <div className="order-detail-row">
                <span className="order-detail-label">Idempotency Key</span>
                <span className="order-detail-value order-detail-value--mono">
                  {order.idempotencyKey.slice(0, 8)}...
                </span>
              </div>
            </div>
          </>
        ) : error ? (
          <>
            {/* Erro */}
            <div className="modal-icon modal-icon--error">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h2 className="modal-title modal-title--error">Erro no Checkout</h2>
            <p className="modal-error-message">{error.message}</p>
          </>
        ) : null}

        <button className="modal-close-btn" onClick={onReset}>
          {order ? 'Continuar Comprando' : 'Tentar Novamente'}
        </button>
      </div>
    </div>
  );
}
