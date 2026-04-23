import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import healthRouter from "./routes/health";
import authRouter from "./routes/auth";
import debtsRouter from "./routes/debts";
import paymentsRouter, { paymentDeleteRouter } from "./routes/payments";

const app: Express = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/debts", debtsRouter);
app.use("/api/debts", paymentsRouter);
app.use("/api/payments", paymentDeleteRouter);

export default app;
