import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/server';
import { store } from '../src/store';
import { idempotencyCache } from '../cache';

describe('Checkout API (Integration)', () => {
  // Configurações iniciais
  const validPayload = {
    customerId: 'test-user-123',
    items: [{ productId: 'prod-001', quantity: 1 }],
  };

  beforeEach(() => {
    // Reseta o cache de idempotência antes de cada teste
    // Isso é uma simulação, se o cache fosse Redis, chamaríamos flush
    // Como é em memória, vamos considerar que para os testes de concorrência teremos keys diferentes
  });

  describe('1. Validação de Regras de Negócio', () => {
    it('deve retornar erro 400 se a quantidade for zero ou negativa', async () => {
      const payload = {
        customerId: 'test-user',
        items: [{ productId: 'prod-001', quantity: 0 }],
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('X-Idempotency-Key', 'test-key-validation-1')
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      
      // Teste com quantidade negativa
      const payloadNeg = {
        customerId: 'test-user',
        items: [{ productId: 'prod-001', quantity: -5 }],
      };

      const responseNeg = await request(app)
        .post('/api/v1/orders')
        .set('X-Idempotency-Key', 'test-key-validation-2')
        .send(payloadNeg);

      expect(responseNeg.status).toBe(400);
      expect(responseNeg.body.success).toBe(false);
    });
  });

  describe('2. Idempotência', () => {
    it('deve retornar o cache da primeira chamada ao enviar a mesma X-Idempotency-Key', async () => {
      const idempotencyKey = 'test-idempotency-abc-123';
      
      // Primeira requisição
      const firstResponse = await request(app)
        .post('/api/v1/orders')
        .set('X-Idempotency-Key', idempotencyKey)
        .send(validPayload);

      expect(firstResponse.status).toBe(201);
      expect(firstResponse.body._meta.idempotent).toBe(false);
      const orderId = firstResponse.body.data.id;

      // Segunda requisição (duplicada)
      const secondResponse = await request(app)
        .post('/api/v1/orders')
        .set('X-Idempotency-Key', idempotencyKey)
        .send(validPayload);

      expect(secondResponse.status).toBe(200);
      expect(secondResponse.body._meta.idempotent).toBe(true);
      expect(secondResponse.body.data.id).toBe(orderId);
    });
  });

  describe('3. Concorrência e Estoque', () => {
    it('deve rejeitar pedidos se o volume concorrente superar o estoque (Race Condition)', async () => {
      // Produto prod-005 tem estoque de 100 no mock (seedDatabase).
      // Vamos tentar fazer 6 requisições simultâneas de 20 unidades cada. (Total 120 > 100)
      
      const requests = Array.from({ length: 6 }).map((_, index) => {
        return request(app)
          .post('/api/v1/orders')
          .set('X-Idempotency-Key', `test-concurrent-${index}`)
          .send({
            customerId: 'concurrent-user',
            items: [{ productId: 'prod-005', quantity: 20 }],
          });
      });

      // Disparamos todos juntos
      const responses = await Promise.all(requests);

      // Esperamos que exatamente 5 passem (100 estoque / 20 qtd)
      const successResponses = responses.filter((r) => r.status === 201);
      const failedResponses = responses.filter((r) => r.status === 409); // INSUFFICIENT_STOCK

      expect(successResponses.length).toBe(5);
      expect(failedResponses.length).toBe(1);
      expect(failedResponses[0].body.error.code).toBe('INSUFFICIENT_STOCK');
      
      // Verifica no store final se o estoque de prod-005 chegou em zero.
      const product = store.findProductById('prod-005');
      expect(product?.stock).toBe(0);
    });
  });
});
