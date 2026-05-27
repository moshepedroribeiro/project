import { useState } from 'react';
import type { Product } from '../types';
import { formatCurrency } from '../utils';

interface ProductCardProps {
  product: Product;
  quantity: number;
  onQuantityChange: (productId: string, quantity: number) => void;
}

/**
 * Card individual de produto com seletor de quantidade.
 * Mostra imagem placeholder, nome, preço, estoque e controles +/-.
 */
export function ProductCard({ product, quantity, onQuantityChange }: ProductCardProps) {
  const [imgError, setImgError] = useState(false);
  const isOutOfStock = product.stock === 0;
  const isSelected = quantity > 0;

  return (
    <div
      className={`product-card ${isSelected ? 'product-card--selected' : ''} ${isOutOfStock ? 'product-card--disabled' : ''}`}
    >
      {/* Badge de estoque baixo */}
      {product.stock > 0 && product.stock <= 10 && (
        <div className="product-badge product-badge--low">
          Últimas {product.stock} unidades!
        </div>
      )}
      {isOutOfStock && (
        <div className="product-badge product-badge--out">Esgotado</div>
      )}

      {/* Imagem */}
      <div className="product-image-wrapper">
        {imgError ? (
          <div className="product-image-placeholder">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
          </div>
        ) : (
          <img
            src={product.image}
            alt={product.name}
            className="product-image"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        )}
      </div>

      {/* Info */}
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>

        <div className="product-meta">
          <span className="product-price">{formatCurrency(product.price)}</span>
          <span className={`product-stock ${product.stock <= 10 ? 'product-stock--low' : ''}`}>
            {product.stock > 0 ? `${product.stock} em estoque` : 'Sem estoque'}
          </span>
        </div>

        {/* Seletor de quantidade */}
        {!isOutOfStock && (
          <div className="quantity-selector">
            <button
              className="quantity-btn"
              onClick={() => onQuantityChange(product.id, Math.max(0, quantity - 1))}
              disabled={quantity === 0}
              aria-label="Diminuir quantidade"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>

            <span className="quantity-value">{quantity}</span>

            <button
              className="quantity-btn"
              onClick={() => onQuantityChange(product.id, Math.min(product.stock, quantity + 1))}
              disabled={quantity >= product.stock}
              aria-label="Aumentar quantidade"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
