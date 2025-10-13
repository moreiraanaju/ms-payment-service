// Sobe o servidor HTTP (Express) e define as rotas

import "dotenv/config";
import pino from "pino";
import { errorHandler } from "./middleware/errorHandler.js"; 
import express from "express";
import { createPayment } from "./payments.controller.js";
import pool, { initDb } from "./db.js";


const app = express();
const log = pino({ name: "payment-service" });

app.use(express.json());

app.get("/health", (_, res) => res.send("ok"));
app.post("/payments", createPayment);

app.use(errorHandler);

const port = process.env.PORT || 3000;

// inicializa DB e só então sobe o servidor
(async () => {
  try {
    await initDb();
    app.listen(port, () => log.info(`payment-service on ${port}`));
  } catch (e) {
    log.error(e, "Failed to init DB");
    process.exit(1);
  }
})();
