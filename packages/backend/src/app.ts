import express, { type Express } from "express";
import cors from "cors";
import healthRouter from "./routes/health";

const app: Express = express();

app.use(cors());
app.use(express.json());

app.use("/api/health", healthRouter);

export default app;
