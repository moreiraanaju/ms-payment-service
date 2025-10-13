import { v4 as uuid } from "uuid"; // gera identificadores únicos (evita colisão)
import pool from "./db.js";        // pool de conexões do Postgres - evita abrir/fechar conexão a cada query
import { publish } from "./mq.js"; // função que manda mensagem para o RabbitMQ
import { createPaymentSchema } from "./validations.js"; // esquema Zod que valida o corpo da requisição

export async function createPayment(req, res, next) {
  try {
    const parsed = createPaymentSchema.parse(req.body); // valida e normaliza os dados recebidos
    const { user, amount } = parsed;
    const currency = parsed.currency || "BRL";
    const paymentId = uuid(); // id do pagamento no nosso sistema
    const traceId = parsed.traceId || uuid(); // id de rastreamento (usado na idempotência)

    // Idempotência robusta: tenta inserir, mas ignora se já existir um trace_id igual
    const insert = await pool.query(
      `INSERT INTO payments (id, user_email, amount, currency, status, trace_id)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (trace_id) DO NOTHING
       RETURNING id`,
      [paymentId, user.email, amount, currency, "pending", traceId]
    );

    let effectivePaymentId = paymentId;

    if (insert.rowCount === 0) {
      // Se rowCount = 0, já existia um pagamento com o mesmo traceId → idempotência
      const existing = await pool.query(
        "SELECT id FROM payments WHERE trace_id = $1",
        [traceId]
      );
      effectivePaymentId = existing.rows[0].id;
      // Retorna 200 OK informando que já existe um pagamento registrado com o mesmo traceId
      return res.status(200).json({ message: "duplicate", paymentId: effectivePaymentId });
    }

    // O controller não chama diretamente os outros serviços,
    // ele apenas emite um evento - garantindo acoplamento fraco.
    await publish("payment.requested", {
      eventType: "payment.requested",
      paymentId: effectivePaymentId, user, amount, currency,
      timestamp: new Date().toISOString(),
      traceId
    });

    // Responde cliente com 202 (o servidor aceitou a requisição e vai processar depois)
    // Por que não 201 created: 201 é quando o resultado final já ocorreu,
    // 202 é o padrão REST quando o processamento é assíncrono.
    res
      .status(202)
      .set("Location", `/payments/${effectivePaymentId}`) // adiciona header com o recurso criado
      .json({ paymentId: effectivePaymentId, status: "pending", traceId });

    // Simular processamento e confirmação (3s depois) - isso é apenas para demonstração.
    // Em produção, isso seria feito por um worker ou consumidor de fila que processa o pagamento,
    // atualiza o banco, e publica o evento payment.confirmed.
    setTimeout(async () => {
      try {
        await pool.query("UPDATE payments SET status=$1 WHERE id=$2", ["success", effectivePaymentId]);
        await publish("payment.confirmed", {
          eventType: "payment.confirmed",
          paymentId: effectivePaymentId, user, amount, currency,
          timestamp: new Date().toISOString(),
          traceId
        });
      } catch (err) {
        // Caso ocorra algum erro dentro do setTimeout, ele é logado aqui sem interromper o servidor
        console.error("Erro no pós-processamento:", err);
      }
    }, 3000);

  } catch (e) {
    next(e); // delega para o error handler do Express — separação de responsabilidades:
             // o controller trata o fluxo feliz, o handler centraliza logs, status code e mensagens
  }
}
