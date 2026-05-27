# Capinhas Store - Desafio de E-commerce

Este projeto é uma solução completa (Back-end e Front-end) para um fluxo de checkout de e-commerce focado em mitigar problemas comuns de concorrência de estoque e comunicação com sistemas legados (ERPs) lentos e instáveis.

## 🚀 Arquitetura e Decisões Técnicas

Para lidar com os requisitos do desafio (alta latência de ERP, possibilidade de *double-clicks* e esgotamento de estoque), adotamos as seguintes abordagens:

1. **Desacoplamento do ERP (Workers Assíncronos):** 
   - A requisição de checkout responde imediatamente com `201 Created` (status `PENDING`).
   - A comunicação com o ERP legado é feita de forma assíncrona num Worker em *background*.
   - O Front-end utiliza **Short Polling** para consultar o status real da compra e prover feedback visual limpo.

2. **Idempotência (Prevenção de Pedidos Duplicados):**
   - Utilizamos o header `X-Idempotency-Key` com um UUID gerado pelo cliente.
   - O Back-end faz cache (em memória) do resultado. Se o cliente reenviar a mesma chave (ex: clique duplo), a API devolve o resultado imediato em `200 OK` (sem reservar o estoque novamente).

3. **Atomicidade de Estoque (Mutex Lock):**
   - Durante a finalização do pedido, o sistema cria um bloqueio condicional nos produtos comprados.
   - Isso evita *race conditions* quando múltiplos usuários compram o mesmo item simultaneamente.

4. **Front-end Resiliente:**
   - Construído em **React + Vite** com **Tailwind CSS**.
   - Fluxo de tela de bloqueio durante as verificações (evitando ações acidentais) e apresentação tratada de mensagens de erro provindas do backend via contrato JSON (`error.code`).

---

## 💻 Como Rodar o Projeto

A aplicação está dividida em dois subprojetos: `backend` e `frontend`.

### 1. Rodando o Back-end
Abra um terminal na pasta do projeto e execute:
```bash
cd backend
npm install
npm run dev
```
O servidor estará rodando em `http://localhost:3333`.

*Para rodar a suíte de testes de integração (Vitest + Supertest):*
```bash
npm run test
```

### 2. Rodando o Front-end
Abra um segundo terminal, na mesma raiz do projeto, e execute:
```bash
cd frontend
npm install
npm run dev
```
O site estará disponível na porta informada pelo Vite (geralmente `http://localhost:5173`).

---

## ⚠️ Limitações da Solução Atual (Trade-offs)

Como se trata de um desafio conceitual de arquitetura, a infraestrutura foi fortemente simplificada para ser auto-contida e não necessitar de dependências externas (Docker, Bancos de Dados, etc.):

- **In-Memory Store:** O "banco de dados" (Catálogo, Pedidos), o Mutex de estoque e o Cache de Idempotência vivem inteiramente na memória RAM da aplicação Node.js. Ao reiniciar o servidor, o estado volta ao inicial (Seed).
- **Worker em Thread Principal:** O *background worker* roda de forma solta (`fire-and-forget`) utilizando Promises Node.js em vez de rodar em um contêiner apartado.

---

## 🔮 Próximos Passos (Ambiente de Produção)

Para escalar essa arquitetura para um ambiente de produção real, as seguintes substituições deveriam ser feitas:

1. **Banco de Dados Relacional:** Substituir o `in-memory store` por um banco ACID, como **PostgreSQL**.
2. **Redis para Locks e Idempotência:** Utilizar Redis para o armazenamento descentralizado de Idempotency Keys e controle de estoque distribuído com transações e lock otimista (`WATCH/MULTI/EXEC`).
3. **Message Broker para o Worker:** Migrar o disparo do ERP de uma Promise assíncrona para uma fila real como **RabbitMQ**, **AWS SQS** ou **BullMQ** (apoiado por Redis). Isso permitiria retentativas com *exponential backoff* e envio a uma Dead Letter Queue em caso de falha persistente.
