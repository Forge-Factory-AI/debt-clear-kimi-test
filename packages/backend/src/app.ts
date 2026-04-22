import express, { type Application } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.js";
import debtsRouter from "./routes/debts.js";
import { debtPaymentsRouter, paymentsRouter } from "./routes/payments.js";

const app: Application = express();

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRouter);
app.use("/api/debts", debtsRouter);
app.use("/api/debts/:debtId/payments", debtPaymentsRouter);
app.use("/api/payments", paymentsRouter);

export default app;
