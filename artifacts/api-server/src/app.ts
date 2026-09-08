import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import type { HttpLogger, Options } from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";

const app: Express = express();

const pinoHttpMiddleware = pinoHttp as unknown as (opts?: Options) => HttpLogger;

app.use(
  pinoHttpMiddleware({
    logger,
    serializers: {
      req(req: { id?: unknown; method?: unknown; url?: string }) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: { statusCode?: number }) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.json({
    name: "nexus-admissions-api-server",
    status: "ok",
    health: "/api/healthz",
  });
});

app.use("/api", router);

export default app;
