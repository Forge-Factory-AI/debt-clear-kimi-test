import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import healthRouter from "./routes/health";
import authRouter from "./routes/auth";

const app: Express = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);

export default app;
