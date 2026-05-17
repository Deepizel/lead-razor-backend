import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { apiRouter } from "./routes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("Leads AI Backend Running");
});

app.use("/api", apiRouter);

app.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`);
});
