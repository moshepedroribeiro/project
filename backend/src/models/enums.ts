/**
 * Status do pedido — representa a máquina de estados
 * que governa o ciclo de vida assíncrono de um Order.
 *
 * Fluxo feliz:  PENDING → PROCESSING → COMPLETED
 * Fluxo falha:  PENDING → PROCESSING → FAILED
 *               FAILED  → PROCESSING  (retry)
 */
export enum OrderStatus {
  /** Pedido criado, aguardando processamento assíncrono */
  PENDING = 'PENDING',

  /** Worker consumiu o evento e está sincronizando com o ERP */
  PROCESSING = 'PROCESSING',

  /** ERP confirmou — estoque baixado, pedido finalizado */
  COMPLETED = 'COMPLETED',

  /** Falha na comunicação com o ERP (timeout, erro de rede, etc.) */
  FAILED = 'FAILED',
}
