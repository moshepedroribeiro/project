import type { CartItem } from '../types';
import { formatCurrency } from '../utils';
import { Spinner } from './Spinner';

interface CheckoutBarProps {
  items: CartItem[];
  isLoading: boolean;
  onCheckout: () => void;
}

/**
 * Barra fixa de checkout no rodapé.
 * Mostra resumo do carrinho e botão "Finalizar Compra" com
 * proteção contra double-click (loading + disabled).
 */
export function CheckoutBar({ items, isLoading, onCheckout }: CheckoutBarProps) {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const hasItems = totalItems > 0;

  return (
    <div className={`checkout-bar ${hasItems ? 'checkout-bar--visible' : ''}`}>
      <div className="checkout-bar-inner">
        {/* Resumo */}
        <div className="checkout-summary">
          <div className="checkout-items-count">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            <span>
              {totalItems} {totalItems === 1 ? 'item' : 'itens'}
            </span>
          </div>
          <div className="checkout-total">
            {formatCurrency(totalPrice)}
          </div>
        </div>

        {/* Botão de checkout */}
        <button
          id="checkout-button"
          className="checkout-btn"
          onClick={onCheckout}
          disabled={!hasItems || isLoading}
          aria-busy={isLoading}
        >
          {isLoading ? (
            <>
              <Spinner size={18} />
              <span>Processando...</span>
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              <span>Finalizar Compra</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
