import type { Product } from '../types';

/**
 * Mock local de capinhas de celular — espelha os dados de seed do backend.
 * Preços em centavos (BRL) para evitar floating-point.
 */
export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    name: 'Capinha iPhone 15 Pro - Transparente',
    price: 2990,
    stock: 50,
    image: '/images/case-transparent.webp',
  },
  {
    id: 'prod-002',
    name: 'Capinha Samsung S24 Ultra - Silicone Preto',
    price: 3490,
    stock: 30,
    image: '/images/case-black.webp',
  },
  {
    id: 'prod-003',
    name: 'Capinha Xiaomi 14 - MagSafe Azul',
    price: 4990,
    stock: 15,
    image: '/images/case-blue.webp',
  },
  {
    id: 'prod-004',
    name: 'Capinha iPhone 15 - Couro Marrom',
    price: 8990,
    stock: 10,
    image: '/images/case-brown.webp',
  },
  {
    id: 'prod-005',
    name: 'Capinha Universal - Anti-impacto Militar',
    price: 5990,
    stock: 100,
    image: '/images/case-military.webp',
  },
];
