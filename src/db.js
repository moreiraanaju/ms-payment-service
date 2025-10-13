import pg from "pg"; 
//biblioteca oficial do postgreSQL para NodeJS
// permite que o Node se conecte, envie queries e receba dados do banco de dados  Postgre

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
// pg.Pool cria um pool de conexões com o banco de dados.
// Em vez de abrir e fechar uma nova conexão toda vez que você faz uma query,
// o “pool” mantém várias conexões abertas e as reutiliza — isso melhora muito a performance.

// Essa função roda uma única vez na inicialização do app.
// Ela garante que a tabela "payments" exista antes de qualquer requisição.
export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id uuid PRIMARY KEY,
      user_email text NOT NULL,
      amount numeric NOT NULL,
      currency text NOT NULL,
      status text NOT NULL,
      trace_id uuid UNIQUE,
      created_at timestamp DEFAULT now()
    );
  `);

  console.log("✅ Tabela 'payments' garantida no banco de dados.");

}

export default pool;
//exporta o pool de conexões para ser usado em outros arquivos
//quando quiser consultar o banco é importar : import pool from "./db.js";