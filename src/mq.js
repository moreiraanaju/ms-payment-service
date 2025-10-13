import amqp from "amqplib";

let channel;
export async function getChannel() {
  if (channel) return channel;  // se o canal ja existir, ele reaproveita o mesmo 
  const conn = await amqp.connect(process.env.AMQP_URL);  // conecta no canal
  channel = await conn.createChannel();
  await channel.assertExchange("payments.x", "topic", { durable: true });  //garantimos q exista uma exchange chamada "payments.x"
  return channel;                                                         // durable : true significa que a exchange continua existindo mesmo se o Rabbit reiniciar (persistencia)
}

export async function publish(eventType, payload) { // função que envia mensagem para o rabbit
  const ch = await getChannel(); //pega o canal e cria um novo caso não exista (usando a função anterior)
  ch.publish("payments.x", eventType, Buffer.from(JSON.stringify(payload)), { persistent: true });
  // Buffer.from(JSON.stringify(payload)) -> transforma o objeto da mensgaem em texto puro para poder ser enviado
  //{ persistent: true } garante que a mensagem não se perca se o rabbit reiniciar
}
