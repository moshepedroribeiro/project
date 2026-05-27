# Sumário de Prompts

Este arquivo lista os *prompts* mais relevantes utilizados na concepção e evolução arquitetural desta aplicação utilizando Inteligência Artificial, demonstrando o passo a passo da tomada de decisões.

### 1. Desacoplamento da Interface com o ERP
> "Temos um e-commerce em React/Node onde a finalização do checkout depende de um ERP legado que costuma demorar 30 segundos ou dar timeout. Como podemos desacoplar o front-end dessa lentidão para não prender a tela do usuário e garantir que a compra não seja perdida? Liste os padrões de arquitetura e me guie para aplicá-los num projeto Node.js."

### 2. Resolvendo Duplicidade de Pedidos
> "Quando o ERP demora, os usuários ficam impacientes e clicam em 'Finalizar' várias vezes, gerando pedidos duplicados na API. Crie um mecanismo de controle de fluxo e idempotência na rota POST /orders do backend utilizando um cache de memória. Além disso, no front-end em React, me dê o código para gerar um UUID no client-side como X-Idempotency-Key em cada transação."

### 3. Evitando Race Conditions de Estoque
> "Percebemos falhas onde o estoque fica negativo porque duas pessoas pedem as últimas peças simultaneamente (race condition). No serviço de Node.js que estamos criando, escreva uma camada de Mutex (Lock em memória) que bloqueie a checagem e a baixa do estoque durante a montagem do pedido de forma atômica."

### 4. Implementando o Worker e o Polling
> "Agora, precisamos criar a função que simula a integração com o ERP em background (Worker assíncrono). Escreva uma função processOrderWithERP(orderId: string) que execute as seguintes regras:
> - Use um setTimeout para simular uma lentidão intencional do ERP (ex: 2 segundos).
> - Simule uma taxa de instabilidade de 20% das vezes o ERP falha com Timeout ou Erro Técnico 500.
> - Se a simulação falhar, atualize o status do pedido local para FAILED. Se funcionar, mude para COMPLETED.
> Adicione também um endpoint GET /api/v1/orders/:id para que o front-end consiga consultar o status atual do pedido (Polling). Garanta que as respostas JSON sigam o padrão de contratos de erro robustos (com statusCode, errorCode e message amigável)."

### 5. Finalizando a Experiência de UI com Tailwind
> "Complemente o código do front-end adicionando a lógica de tratamento de respostas pós-checkout:
> Ao receber o status 201 Created do back-end, inicie um mecanismo de short polling (consultando o endpoint GET /api/v1/orders/:id a cada 2 ou 3 segundos).
> Enquanto o status for PROCESSING, mantenha o estado de loading visual.
> Se o status mudar para COMPLETED, exiba um feedback visual de sucesso amigável.
> Se a API retornar um erro imediato, ou se o polling retornar FAILED, exiba um alerta visual claro (uma toast ou banner vermelho estruturado via Tailwind) informando exatamente o que aconteceu de forma compreensível para o usuário."

### 6. Testes Automatizados da API
> "Gere um conjunto de testes usando Vitest e Supertest para o back-end da nossa aplicação de checkout. Foque em cobrir os seguintes cenários: 
> Um teste unitário que garanta que a validação falha se a quantidade de itens for zero ou negativa. 
> Um teste de integração que simule duas requisições consecutivas com a mesma X-Idempotency-Key. 
> Um teste estruturado que simule o comportamento de concorrência: o que acontece se baterem requisições cujo volume acumulado supera o estoque disponível no mock."
