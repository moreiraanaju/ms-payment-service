# ms-payment-service

Serviço responsável por processar pagamentos no e-commerce **CompreFácil**, registrando transações e publicando eventos assíncronos via **RabbitMQ**.  
Faz parte da arquitetura distribuída composta também pelo serviço `ms-notification-service`.

---

## 🧱 Arquitetura

Cliente → [Payment API] → Postgres
↓
RabbitMQ (exchange: payments.x)
↓
[Notification Service]


Fluxo:
1. Recebe solicitação via `POST /payments`
2. Registra transação com `status=pending`
3. Publica evento `payment.requested`
4. Após 3 s, simula confirmação e atualiza `status=success`
5. Publica evento `payment.confirmed`

---

## ⚙️ Requisitos

- Node.js LTS  
- Docker e Docker Compose

---

## 🚀 Como executar

1. Subir infra de apoio (Postgres + RabbitMQ):

docker compose up -d

2. Criar arquivo .env:

DATABASE_URL=postgres://msuser:mspass@localhost:5432/paymentsdb
AMQP_URL=amqp://guest:guest@localhost:5672
PORT=3000

3. Instalar dependências e iniciar:

npm install
npm run dev
RabbitMQ UI: http://localhost:15672 (guest/guest)

---

## 🔗 Endpoint

POST /payments
Cria uma nova transação.

{
  "user": {"id": "u1", "email": "aluno@exemplo.com"},
  "amount": 129.9,
  "currency": "BRL"
}

Resposta:
{
  "paymentId": "uuid",
  "status": "pending",
  "traceId": "uuid"
}

---

## 📦 Eventos publicados

Exchange payments.x (tipo: topic)

payment.requested → notifica que o pedido foi recebido
payment.confirmed → notifica confirmação de pagamento

---

## 📁 Estrutura
src/
 ├─ index.js
 ├─ db.js
 ├─ mq.js
 ├─ payments.controller.js
 └─ validations.js