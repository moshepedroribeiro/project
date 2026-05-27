/**
 * Gera um UUID v4 no client-side usando a Web Crypto API.
 * Usado para gerar X-Idempotency-Key antes de cada checkout.
 */
export function generateUUID(): string {
  // Usa crypto.randomUUID() quando disponível (navegadores modernos)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback manual para ambientes sem randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Formata um valor em centavos para moeda BRL.
 * Ex: 2990 → "R$ 29,90"
 */
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}
