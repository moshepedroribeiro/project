import { Order } from '../models';

/**
 * Cache de Idempotência — simula um Redis com TTL.
 *
 * Armazena a resposta associada a cada `idempotencyKey` para que
 * requisições duplicadas (retry, double-click, falha de rede)
 * retornem o mesmo resultado sem reprocessar.
 *
 * ┌──────────────────────────────────────────────────────┐
 * │  Em produção (Redis):                                 │
 * │                                                       │
 * │  SET idempotency:{key} {orderJSON} EX 86400 NX       │
 * │                                                       │
 * │  - NX: só seta se não existir (atômico)               │
 * │  - EX 86400: TTL de 24h (auto-limpeza)                │
 * │  - Se SET retorna null → chave já existia → retornar  │
 * │    GET idempotency:{key}                              │
 * └──────────────────────────────────────────────────────┘
 */
class IdempotencyCache {
  private cache: Map<string, { order: Order; expiresAt: number }> = new Map();

  /** TTL padrão: 24 horas (em ms) */
  private readonly TTL_MS = 24 * 60 * 60 * 1000;

  /**
   * Verifica se a chave já foi processada.
   * Retorna o pedido cacheado ou `undefined`.
   */
  get(key: string): Order | undefined {
    const entry = this.cache.get(key);

    if (!entry) return undefined;

    // Verifica expiração (simulando TTL do Redis)
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return { ...entry.order };
  }

  /**
   * Registra uma chave de idempotência com o resultado.
   * Em Redis: `SET idempotency:{key} {orderJSON} EX 86400`
   */
  set(key: string, order: Order): void {
    this.cache.set(key, {
      order: { ...order },
      expiresAt: Date.now() + this.TTL_MS,
    });
  }

  /**
   * Verifica se a chave existe (sem retornar o valor).
   * Útil para o "lock" de processamento em andamento.
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }
}

/** Singleton — compartilhado por toda a aplicação */
export const idempotencyCache = new IdempotencyCache();
