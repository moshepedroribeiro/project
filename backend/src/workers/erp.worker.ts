import { OrderStatus } from '../models';
import { store } from '../store';

/**
 * Tipos de falha simulados do ERP legado.
 */
type ErpFailureReason = 'ERP_TIMEOUT' | 'ERP_INTERNAL_ERROR';

interface ErpResult {
  success: boolean;
  durationMs: number;
  error?: {
    reason: ErpFailureReason;
    message: string;
  };
}

/**
 * Configuração do simulador ERP.
 *
 * Em produção, estes valores viriam de variáveis de ambiente
 * ou de um serviço de configuração centralizado (ex: Consul/Vault).
 */
const ERP_CONFIG = {
  /** Latência base simulada do ERP (ms) */
  BASE_LATENCY_MS: 2000,

  /** Jitter aleatório adicional (0 a este valor em ms) */
  JITTER_MS: 1000,

  /** Taxa de falha do ERP (0.0 a 1.0) — 20% */
  FAILURE_RATE: 0.2,
} as const;

/**
 * Simula a chamada HTTP ao ERP legado.
 *
 * Em produção seria algo como:
 * ```
 * const response = await axios.post('https://erp-legado.internal/api/orders', {
 *   orderId, items, ...
 * }, { timeout: 30_000 });
 * ```
 *
 * @returns Promise que resolve após a latência simulada
 */
function simulateErpCall(): Promise<ErpResult> {
  const latency = ERP_CONFIG.BASE_LATENCY_MS + Math.random() * ERP_CONFIG.JITTER_MS;
  const willFail = Math.random() < ERP_CONFIG.FAILURE_RATE;

  return new Promise((resolve) => {
    setTimeout(() => {
      if (willFail) {
        // Alterna entre os dois tipos de falha
        const isTimeout = Math.random() < 0.5;
        resolve({
          success: false,
          durationMs: Math.round(latency),
          error: isTimeout
            ? {
                reason: 'ERP_TIMEOUT',
                message: 'Conexão com ERP expirou após 30s (simulado)',
              }
            : {
                reason: 'ERP_INTERNAL_ERROR',
                message: 'ERP retornou HTTP 500 — Internal Server Error (simulado)',
              },
        });
      } else {
        resolve({
          success: true,
          durationMs: Math.round(latency),
        });
      }
    }, latency);
  });
}

/**
 * processOrderWithERP — Worker assíncrono que processa um pedido
 * simulando a integração com o ERP legado.
 *
 * ## Ciclo de vida
 *
 * ```
 *  PENDING ──► PROCESSING ──┬──► COMPLETED  (ERP confirmou)
 *                           └──► FAILED     (ERP falhou)
 * ```
 *
 * ## Em produção
 *
 * Esta função seria substituída por:
 * - Um consumer de fila (RabbitMQ, SQS, BullMQ)
 * - Executando em um processo/container separado
 * - Com retry automático (exponential backoff)
 * - Dead Letter Queue para falhas persistentes
 * - Observabilidade via OpenTelemetry
 *
 * @param orderId - ID do pedido a processar
 */
export async function processOrderWithERP(orderId: string): Promise<void> {
  const logPrefix = `[ERP-WORKER] [${orderId}]`;

  // ── 1. Verificar se o pedido existe ──
  const order = store.findOrderById(orderId);

  if (!order) {
    console.error(`${logPrefix} ❌ Pedido não encontrado — abortando`);
    return;
  }

  if (order.status !== OrderStatus.PENDING) {
    console.warn(
      `${logPrefix} ⚠️  Pedido não está PENDING (status atual: ${order.status}) — ignorando`
    );
    return;
  }

  // ── 2. Transicionar para PROCESSING ──
  store.updateOrderStatus(orderId, OrderStatus.PROCESSING);
  console.log(`${logPrefix} 🔄 Status: PENDING → PROCESSING`);

  // ── 3. Chamar o ERP (simulado) ──
  console.log(`${logPrefix} 📡 Enviando para ERP legado...`);

  const result = await simulateErpCall();

  // ── 4. Atualizar status baseado no resultado ──
  if (result.success) {
    store.updateOrderStatus(orderId, OrderStatus.COMPLETED);
    console.log(
      `${logPrefix} ✅ Status: PROCESSING → COMPLETED (${result.durationMs}ms)`
    );
  } else {
    store.updateOrderStatus(orderId, OrderStatus.FAILED);
    console.error(
      `${logPrefix} ❌ Status: PROCESSING → FAILED — ${result.error!.reason}: ${result.error!.message} (${result.durationMs}ms)`
    );
  }
}
