/**
 * Representa um produto (capinha de celular) armazenado
 * localmente na aplicação da loja.
 *
 * O campo `stock` é a "fotografia" do estoque local —
 * a sincronização com o ERP legado (MySQL) acontece
 * de forma assíncrona via fila de eventos.
 */
export interface Product {
  /** Identificador único (UUID v4) */
  id: string;

  /** Nome / descrição curta do produto */
  name: string;

  /** Preço unitário em centavos (evita floating-point) */
  price: number;

  /** Quantidade disponível no estoque local */
  stock: number;
}

/**
 * DTO para criação de produto — omite `id`
 * porque será gerado pelo servidor.
 */
export type CreateProductDTO = Omit<Product, 'id'>;

/**
 * DTO para atualização parcial de produto.
 */
export type UpdateProductDTO = Partial<Omit<Product, 'id'>>;
