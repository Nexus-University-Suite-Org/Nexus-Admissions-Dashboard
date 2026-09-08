import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import type { HttpLogger, Options } from "pino-http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".woff2": "font/woff2",
};

function resolvePublicDir(): string | null {
  const candidates = [
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "public"),
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public"),
    path.resolve(process.cwd(), "public"),
  ];

  return (
    candidates.find((dir) => existsSync(path.join(dir, "index.html"))) ?? null
  );
}

const publicDir = resolvePublicDir();

app.use((req, res, next) => {
  if (!publicDir || req.method !== "GET" || req.path.startsWith("/api")) {
    return next();
  }

  const relPath = req.path === "/" ? "/index.html" : req.path;
  const filePath = path.join(publicDir, relPath);

  if (!filePath.startsWith(publicDir + path.sep) && relPath !== "/index.html") {
    return next();
  }

  readFile(filePath)
    .then((data) => {
      const ext = path.extname(filePath).toLowerCase();
      res.type(MIME_TYPES[ext] ?? "application/octet-stream").send(data);
    })
    .catch(() => next());
});

app.use("/api", router);

app.get("/", (_req, res) => {
  res.json({
    name: "nexus-admissions-api-server",
    status: "ok",
    health: "/api/healthz",
  });
});

app.use((req, res, next) => {
  if (!publicDir || req.method !== "GET" || req.path.startsWith("/api")) {
    return next();
  }

  readFile(path.join(publicDir, "index.html"))
    .then((data) => res.type("text/html; charset=utf-8").send(data))
    .catch(() => next());
});

export default app;
