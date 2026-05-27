import { useState, useCallback } from 'react';
import { MOCK_PRODUCTS } from './data/products';
import { ProductCard } from './components/ProductCard';
import { CheckoutBar } from './components/CheckoutBar';
import { OrderResult } from './components/OrderResult';
import { createOrder, getOrderStatus } from './services/api';
import { generateUUID } from './utils';
import type { CartItem, OrderResponse, CheckoutError } from './types';

/**
 * StorePage — página principal da loja de capinhas.
 *
 * Gerencia:
 * - Quantidades selecionadas por produto
 * - Estado de loading no checkout (previne double-click)
 * - Geração de X-Idempotency-Key (UUID) no client-side
 * - Exibição de resultado (sucesso ou erro)
 */
function App() {
  // Map de productId → quantidade selecionada
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderResult, setOrderResult] = useState<OrderResponse | null>(null);
  const [checkoutError, setCheckoutError] = useState<CheckoutError | null>(null);

  // Monta a lista de CartItems a partir das quantidades
  const cartItems: CartItem[] = MOCK_PRODUCTS
    .filter((p) => (quantities[p.id] ?? 0) > 0)
    .map((p) => ({ product: p, quantity: quantities[p.id] }));

  const handleQuantityChange = useCallback((productId: string, quantity: number) => {
    setQuantities((prev) => ({ ...prev, [productId]: quantity }));
  }, []);

  const handleCheckout = useCallback(async () => {
    if (isCheckingOut || cartItems.length === 0) return;

    setIsCheckingOut(true);
    setCheckoutError(null);
    setOrderResult(null);

    const idempotencyKey = generateUUID();

    try {
      let order = await createOrder(
        {
          customerId: 'customer-demo-001',
          items: cartItems.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
        },
        idempotencyKey
      );

      // Short polling: Consulta status a cada 2.5s
      while (order.status === 'PENDING' || order.status === 'PROCESSING') {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        order = await getOrderStatus(order.id);
      }

      if (order.status === 'FAILED') {
        throw new Error('Falha no processamento com o ERP. Por favor, tente novamente.');
      }

      setOrderResult(order);
      setQuantities({});
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'Ocorreu um erro inesperado. Tente novamente.';
      setCheckoutError({ message });
    } finally {
      setIsCheckingOut(false);
    }
  }, [isCheckingOut, cartItems]);

  const handleResetResult = useCallback(() => {
    setOrderResult(null);
    setCheckoutError(null);
  }, []);

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <div className="header-brand">
            <div className="header-logo">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
            </div>
            <div>
              <h1 className="header-title">CaseStore</h1>
              <p className="header-subtitle">Capinhas Premium para Celular</p>
            </div>
          </div>

          <div className="header-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Compra Segura</span>
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="main">
        <div className="section-header">
          <h2 className="section-title">Nossas Capinhas</h2>
          <p className="section-subtitle">
            Proteção e estilo para o seu smartphone. Selecione os itens e finalize sua compra.
          </p>
        </div>

        <div className="product-grid">
          {MOCK_PRODUCTS.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              quantity={quantities[product.id] ?? 0}
              onQuantityChange={handleQuantityChange}
            />
          ))}
        </div>
      </main>

      {/* Banner de Erro (Tailwind) */}
      {checkoutError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg shadow-lg flex items-start gap-3 transition-all duration-300 ease-in-out">
          <svg className="w-6 h-6 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">Erro no Checkout</h3>
            <p className="text-sm mt-1">{checkoutError.message}</p>
          </div>
          <button onClick={handleResetResult} className="text-red-500 hover:text-red-700 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Barra de checkout fixa */}
      <CheckoutBar
        items={cartItems}
        isLoading={isCheckingOut}
        onCheckout={handleCheckout}
      />

      {/* Modal de resultado (Apenas Sucesso) */}
      {orderResult && (
        <OrderResult
          order={orderResult}
          error={null}
          onReset={handleResetResult}
        />
      )}
    </div>
  );
}

export default App;
