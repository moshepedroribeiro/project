/**
 * StockLock — Mutex assíncrono por produto.
 *
 * Garante que operações de check-and-decrement sobre o estoque
 * de um mesmo produto sejam serializadas, evitando race conditions
 * causadas por intercalação de await's no event loop.
 *
 * ┌───────────────────────────────────────────────────────┐
 * │  Problema sem lock:                                    │
 * │                                                        │
 * │  Req A: lê estoque = 1    ──┐                         │
 * │  Req B: lê estoque = 1    ──┤  (intercalação no await) │
 * │  Req A: decrementa → 0    ──┤                         │
 * │  Req B: decrementa → -1   ──┘  ← OVERSELLING!        │
 * │                                                        │
 * │  Com lock:                                             │
 * │                                                        │
 * │  Req A: acquire(prod-1) → lê e decrementa → release   │
 * │  Req B: aguarda...      → lê estoque = 0  → rejeita   │
 * └───────────────────────────────────────────────────────┘
 *
 * Em produção, este lock seria substituído por:
 *   - Redis WATCH/MULTI/EXEC (optimistic locking)
 *   - Redis DECRBY atômico (ver explicação no controller)
 *   - SELECT ... FOR UPDATE no PostgreSQL
 */
class StockLock {
  /**
   * Map de productId → Promise chain.
   * Cada produto tem sua própria fila de execução.
   */
  private locks: Map<string, Promise<void>> = new Map();

  /**
   * Adquire o lock para um conjunto de productIds e executa
   * a função `fn` de forma serializada.
   *
   * Se múltiplos produtos precisam ser reservados atomicamente
   * (como em um pedido com vários itens), todos os locks são
   * adquiridos na mesma chamada para evitar deadlock.
   *
   * Os productIds são ordenados para garantir uma ordem
   * determinística de aquisição (prevenção de deadlock).
   */
  async withLock<T>(productIds: string[], fn: () => T | Promise<T>): Promise<T> {
    // Ordena IDs para prevenir deadlock (lock ordering)
    const sortedIds = [...new Set(productIds)].sort();

    // Encadeia na promise existente de cada produto
    const previousLocks = sortedIds.map(
      (id) => this.locks.get(id) ?? Promise.resolve()
    );

    let resolveCurrent!: () => void;
    const currentLock = new Promise<void>((resolve) => {
      resolveCurrent = resolve;
    });

    // Registra o novo lock para cada produto
    for (const id of sortedIds) {
      this.locks.set(id, currentLock);
    }

    try {
      // Aguarda todos os locks anteriores dos produtos envolvidos
      await Promise.all(previousLocks);

      // Executa a operação protegida
      return await fn();
    } finally {
      // Libera o lock
      resolveCurrent();

      // Limpa referências se este ainda é o lock ativo
      for (const id of sortedIds) {
        if (this.locks.get(id) === currentLock) {
          this.locks.delete(id);
        }
      }
    }
  }
}

/** Singleton — compartilhado por toda a aplicação */
export const stockLock = new StockLock();
