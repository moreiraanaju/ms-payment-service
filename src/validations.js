import { z } from "zod";

export const createPaymentSchema = z.object({
  user: z.object({
    id: z.string().min(1),
    email: z.string().email()
  }),
  amount: z.number().positive(),
  currency: z.string().default("BRL").optional(),
  traceId: z.string().uuid().optional()
});
