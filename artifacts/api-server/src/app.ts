import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import router from "./routes";
import { logger } from "./lib/logger";
import { attachUser } from "./lib/auth";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Basic security headers
app.use(helmet());

// Configure CORS: set `CORS_ORIGINS` to a comma-separated list in production
let corsOptions: any = { origin: false };
if (process.env.CORS_ORIGINS) {
  const allowed = process.env.CORS_ORIGINS.split(",").map((s) => s.trim());
  corsOptions = {
    origin: function (origin: any, callback: any) {
      // Allow non-browser requests (server-to-server, curl)
      if (!origin) return callback(null, true);
      if (allowed.includes("*")) return callback(null, true);
      return callback(null, allowed.includes(origin));
    },
    optionsSuccessStatus: 200,
  };
}
app.use(cors(corsOptions));

// Rate limiter for API endpoints
const apiLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.RATE_LIMIT_MAX || 100),
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Attach user then apply router (rate-limited)
app.use("/api", attachUser, apiLimiter, router);

export default app;
