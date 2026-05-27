import { z } from 'zod';

/**
 * Schema Zod para validação do payload de criação de pedido.
 *
 * Regras:
 * - `customerId`: string não-vazia, trimada
 * - `items`: array com pelo menos 1 item
 *   - `productId`: string não-vazia (UUID)
 *   - `quantity`: inteiro positivo (mínimo 1)
 */
export const CreateOrderSchema = z.object({
  customerId: z
    .string({ required_error: 'customerId é obrigatório' })
    .trim()
    .min(1, 'customerId não pode ser vazio'),

  items: z
    .array(
      z.object({
        productId: z
          .string({ required_error: 'productId é obrigatório' })
          .trim()
          .min(1, 'productId não pode ser vazio'),

        quantity: z
          .number({ required_error: 'quantity é obrigatório' })
          .int('quantity deve ser um número inteiro')
          .positive('quantity deve ser maior que zero'),
      }),
      { required_error: 'items é obrigatório' }
    )
    .min(1, 'O pedido deve conter pelo menos 1 item'),
});

/**
 * Tipo inferido do schema — usado nos services/controllers
 * sem duplicar definição manual.
 */
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
