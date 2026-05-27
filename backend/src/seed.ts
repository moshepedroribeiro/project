import { store } from './store';
import { Product } from './models';

/**
 * Dados iniciais para demonstração.
 * Simula o catálogo de capinhas carregado do ERP.
 */
const SEED_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    name: 'Capinha iPhone 15 Pro - Transparente',
    price: 2990, // R$ 29,90
    stock: 50,
  },
  {
    id: 'prod-002',
    name: 'Capinha Samsung S24 Ultra - Silicone Preto',
    price: 3490, // R$ 34,90
    stock: 30,
  },
  {
    id: 'prod-003',
    name: 'Capinha Xiaomi 14 - MagSafe Azul',
    price: 4990, // R$ 49,90
    stock: 15,
  },
  {
    id: 'prod-004',
    name: 'Capinha iPhone 15 - Couro Marrom',
    price: 8990, // R$ 89,90
    stock: 10,
  },
  {
    id: 'prod-005',
    name: 'Capinha Universal - Anti-impacto Militar',
    price: 5990, // R$ 59,90
    stock: 100,
  },
];

export function seedDatabase(): void {
  store.seedProducts(SEED_PRODUCTS);
  console.log(`[SEED] ${SEED_PRODUCTS.length} produtos carregados no catálogo`);
}
