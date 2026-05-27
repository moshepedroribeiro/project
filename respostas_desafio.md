# Respostas do Desafio – Arquitetura de E-commerce

Este documento contém as respostas para o Item 1.A, baseadas no diagnóstico e na arquitetura implementada no nosso ecossistema atual (separação de frontend, backend em Node.js com TypeScript, processamento assíncrono e controle de concorrência e idempotência).

---

## Pergunta 1 — Diagnóstico e trade-offs

Abaixo estão os 3 principais problemas resolvidos por nossa arquitetura:

### 1. Gargalo de Comunicação Síncrona com o ERP
* **Causa do problema:** O fluxo de checkout estava atrelado a chamadas HTTP síncronas para um ERP legado e lento.
* **Impacto:** Alta latência, timeouts no checkout, abandono de carrinho, perda de vendas e péssima experiência do usuário em horários de pico.
* **Caminhos possíveis:**
  1. **Mensageria/Filas (Assíncrono):** Desacoplar via RabbitMQ/SQS ou Workers em background (como implementado com nosso `orderService`).
  2. **Circuit Breaker + Timeout Curto:** Manter síncrono, mas com falha rápida caso o ERP demore.
* **Trade-offs/Riscos:** A opção 1 traz complexidade de infraestrutura e a necessidade de lidar com "consistência eventual" (polling no frontend). A opção 2 mantém a arquitetura simples, mas não evita a perda de vendas quando o ERP cai.
* **Priorização:** Priorizaria o **Caminho 1 (Filas/Assíncrono)**. Desacoplar serviços críticos garante que a loja sempre capture o pedido do cliente, independentemente da saúde do ERP, protegendo a receita.

### 2. Concorrência e Overselling (Venda de produto sem estoque)
* **Causa do problema:** Múltiplas requisições simultâneas lendo e atualizando o estoque no banco sem isolamento adequado (falta de locks).
* **Impacto:** Vender produtos esgotados, causando cancelamentos forçados, chargebacks e destruição da confiança do cliente.
* **Caminhos possíveis:**
  1. **Lock Otimista/Pessimista no Banco de Dados:** Uso de `SELECT FOR UPDATE` ou versionamento no banco relacional.
  2. **Operações atômicas com Cache (Redis):** Controle de decremento via `DECRBY` no Redis ou Mutex/Locks locais na aplicação (como nosso `StockLock`).
* **Trade-offs/Riscos:** Lock no banco pode gerar gargalos e deadlocks em cenários de alta concorrência (ex: Black Friday). O Redis é extremamente rápido, mas adiciona mais um componente na infraestrutura que precisa de alta disponibilidade.
* **Priorização:** Priorizaria **Operações atômicas no Redis**. Em e-commerces, produtos populares esgotam em segundos. O banco relacional sofreria muita contenção, e o Redis resolve isso de forma performática e nativa.

### 3. Falta de Idempotência (Cobranças duplicadas)
* **Causa do problema:** Falhas de rede (timeouts) fazem o frontend/cliente tentar novamente (retry ou duplo clique), processando o mesmo pedido mais de uma vez.
* **Impacto:** Limite de cartão do cliente estourado, pedidos despachados em dobro, sobrecarga do SAC e custos judiciais.
* **Caminhos possíveis:**
  1. **Idempotency Key no Backend:** O front envia um UUID e o backend usa um cache de curta duração para ignorar requisições repetidas (nossa abordagem).
  2. **Tratamento Exclusivo no Frontend:** Desabilitar botões de "Comprar" após o clique.
* **Trade-offs/Riscos:** Tratar no frontend é fácil, mas falha em quedas de internet. A chave de idempotência no backend é segura, porém exige armazenar o estado das respostas (armazenar a resposta original no cache).
* **Priorização:** Priorizaria a **Idempotency Key no Backend**. É o único caminho robusto e profissional para evitar anomalias financeiras.

---

## Pergunta 2 — Arquitetura alvo incremental

A meta é tornar a loja independente das flutuações do ERP durante o fluxo crítico (navegação e checkout).

* **Componentes Principais:**
  * **Frontend (React):** Consome a API, faz short-polling após checkout.
  * **Store API (Node.js):** Valida, aplica idempotência e salva o pedido no seu banco próprio.
  * **Background Workers/Fila:** Consomem os pedidos salvos e tentam integrar com o ERP de forma assíncrona.
  * **Banco Próprio & Cache (PostgreSQL + Redis):** Banco da loja que contém um "espelho" do catálogo e estoque.
* **Fluxo de dados:** O front envia o pedido → API consulta o Redis para checar estoque → Se OK, subtrai atomicamente e salva no Postgres da loja (Status: `PENDING`) → API devolve `201 Created` → Worker pega o pedido no Postgres e tenta enviar ao ERP. O Front faz polling no endpoint `GET /orders/:id`.
* **Uso de ferramentas:**
  * **Cache (Redis):** Idempotência (TTL de horas) e controle atômico de estoque (`DECRBY`).
  * **Fila/Jobs (SQS/RabbitMQ):** Retentativas automáticas e dead-letter queues (DLQ) para o ERP.
  * **Banco Próprio:** Única fonte de verdade (Source of Truth) rápida e disponível para a vitrine e checkout.
* **Sincronização ERP ↔ Loja:**
  * Atualizações de estoque/catálogo do ERP usam uma rota de **Webhook** da loja, para atualizar o Banco e o Redis.
* **Plano de 30 a 90 dias:**
  * **Dias 1-30:** Criar o banco próprio e processos (jobs noturnos) para espelhar catálogo e estoque do ERP para a Loja.
  * **Dias 31-60:** Mudar o checkout para assíncrono, introduzindo a Fila e o Worker. A API responde imediatamente e o worker fala com o ERP.
  * **Dias 61-90:** Refinar a concorrência usando Redis para locks/estoque, implementar idempotência robusta e alertas automáticos se a fila do ERP travar.

---

## Pergunta 3 — Estoque, concorrência e idempotência

Quando dois clientes tentam comprar a última unidade simultaneamente:

* **Como evitar venda duplicada:** A checagem de estoque não pode ser feita em passos separados (ler e depois subtrair). Ela ocorre de forma atômica. Se usarmos Redis, o comando `DECRBY` (ou nosso `StockLock`) executado pelo Cliente A reduz o estoque de 1 para 0. Quando o Cliente B tentar a execução, o estoque estará 0 e o pedido do Cliente B será rejeitado antes do pagamento.
* **Reserva de Estoque:** A reserva ocorre no momento em que o cliente clica em "Finalizar" e a API aceita a requisição (status `PENDING`). Essa reserva (soft lock) expira via um TTL (ex: 15 minutos) caso o pagamento não seja confirmado ou o ERP acuse um erro fatal, devolvendo o item para a vitrine.
* **Retry, timeout ou duplo clique:** O frontend gera um UUID único por tentativa de "carrinho" (a chave de idempotência). Se a internet cair e o front fizer um *retry*, a mesma chave será enviada na nova requisição.
* **Idempotência para evitar duplicação:** Ao receber o POST, o backend checa no Redis se a chave `X-Idempotency-Key` já existe. Se existir, ele apenas retorna a resposta processada na requisição anterior (HTTP 200 ao invés de 201), não criando um pedido novo.
* **Reconciliação ERP x Loja:** Teremos uma rotina diária (CRON job) que extrai os pedidos do ERP do dia anterior e bate com os da Loja. Divergências (ex: "Pedido na Loja que nunca chegou no ERP") são sinalizadas num painel administrativo para intervenção manual.

---

## Pergunta 4 — Contrato de API e modelo de erros

### Endpoint: `POST /api/v1/orders`

**Payload Mínimo de Entrada:**
```json
// Headers: X-Idempotency-Key: "550e8400-e29b-41d4-a716-446655440000"
{
  "customerId": "uuid-cliente",
  "items": [
    { "productId": "capinha-iphone-15", "quantity": 1 }
  ]
}
```

**Respostas:**
* **Sucesso (`201 Created`):**
  * Retorna os dados do pedido (`status: PENDING`) e indica que o processamento assíncrono começou.
* **Idempotência Hit (`200 OK`):**
  * Retorna o processamento já existente.
* **Erro de Validação (`400 Bad Request`):**
  * `errorCode`: `VALIDATION_ERROR`
  * `message`: "Payload inválido. Verifique os campos."
  * `details`: Array indicando que `quantity` deve ser maior que zero, por exemplo. O Front deve exibir erros no formulário.
* **Estoque Insuficiente (`409 Conflict`):**
  * `errorCode`: `INSUFFICIENT_STOCK`
  * `message`: "Estoque insuficiente para o produto capinha-iphone-15."
  * O Front deve atualizar o carrinho, avisando o usuário e oferecendo produtos similares ou remover do carrinho.
* **Falha Temporária/Assíncrona:**
  * O `POST` retorna 201. O Front faz *polling* via `GET /orders/:id`. Se após alguns segundos retornar `status: FAILED` e `errorCode: ERP_UNAVAILABLE`, o Front exibe: "Tivemos um problema interno, nossa equipe já está resolvendo e você não será cobrado em duplicidade."

---

## Pergunta 5 — Testes e estratégia de validação

Para garantir resiliência e corretude:

* **Testes Unitários:** Testar os locks isoladamente. Simular concorrência extrema com `Promise.all` para atestar que o lock bloqueia overselling. Testar a validação do schema com Zod.
* **Testes de Integração da API:** Subir a API conectada a um banco/cache de teste (Redis/Postgres mock ou em docker). Disparar um `POST` e garantir que salva no banco. Enviar o mesmo `POST` de novo com a mesma chave de idempotência e assegurar o `200 OK` sem inserir novos registros.
* **Testes de Contrato:** Validar se a API entrega exatamente o JSON documentado (para quebrar os builds do Front caso o Back mude a assinatura inadvertidamente).
* **Cenários de Concorrência (Múltiplas tentativas):** Rodar testes de carga (ex: K6 ou Artillery). Cenário de "Flash Sale": 100 requisições simultâneas para comprar um produto que só tem 5 de estoque. O esperado é apenas 5 sucessos (201) e 95 recusas (409).
* **Testes de Estados do Front-end (React Testing Library):** Mockar as respostas da API e verificar se o botão "Finalizar" fica *disabled* durante o carregamento (evitando duplo clique) e se os modais de sucesso ou o banner de erro vermelho aparecem corretamente.
* **O que automatizar agora e o que deixar para depois:**
  * **Agora:** Automatizar no pipeline de CI os Testes Unitários e de Integração da API (essenciais).
  * **Próximo passo:** Testes de carga / stress com ferramentas reais e Pact Tests (contrato de API).

---

## Pergunta 6 — Uso de IA no desenvolvimento

O uso da IA (como o Gemini) acelera radicalmente o ciclo de vida do desenvolvimento, se usado de forma estratégica.

* **Tipos de Prompts:** 
  * "Escreva testes unitários usando Jest cobrindo concorrência para a seguinte classe de Lock..."
  * "Atue como revisor de segurança e verifique se este código de idempotência está vulnerável a *race conditions*..."
  * "Gere um mock de produtos JSON baseado nas interfaces TypeScript fornecidas."
* **O que delegar:**
  * Geração de templates de código (boilterplate).
  * Geração de dados de mock (fixtures).
  * Expressões regulares complexas e transformações de payload.
  * Estruturas base de testes unitários.
* **O que NÃO delegar:**
  * Decisões cruciais da regra de negócios ou arquiteturais (como a política de expiração do lock do carrinho).
  * Refatorações opacas (Aceitar um bloco enorme sem entender as dependências cruzadas).
* **Como verificar se a resposta está correta:** 
  * A melhor validação é sempre criar um teste automatizado. Se a IA sugere um código de controle de concorrência, é fundamental escrever um teste que simule chamadas assíncronas e verificar falhas. Além disso, a revisão humana atenta contra padrões de projeto da equipe.
* **Riscos de aceitar uma sugestão sem revisão:**
  * **Race conditions silenciosas:** A IA pode implementar um acesso a banco de forma sequencial sem transações adequadas.
  * **Alucinações de bibliotecas:** Inventar métodos que não existem nas bibliotecas nativas, causando erros em runtime.
  * **Vulnerabilidades de Segurança:** Má validação de inputs (ex: SQL injection) caso não instruída explicitamente para sanitizar.
