import { connectDb, ENVIRONMENT, IS_DEVELOPMENT, logger, stream } from "@/common";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import morgan from "morgan";
import { errorHandler } from "./middleware";

let ALLOWED_ORIGINS = [] as string[] | boolean;

if (!IS_DEVELOPMENT) {
  ALLOWED_ORIGINS = [
    "https://nawdelivery.com",
    "https://www.nawdelivery.com",
    "https://admin.nawdelivery.com",
    "http://localhost:3000",
  ];
} else {
  ALLOWED_ORIGINS = true;
}

const app: Express = express();
const REQUEST_BODY_LIMIT = "50kb";

// Allows proxy or load balancer forward the right request headers
app.set("trust proxy", true);

app.use(
  cors({
    origin: ALLOWED_ORIGINS,
    credentials: true,
  }),
);
app.use(cookieParser());
// Email campaign HTML can easily exceed the default small API body size.
app.use(express.json({ limit: REQUEST_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: REQUEST_BODY_LIMIT }));
app.use(compression());
app.use(helmet());
app.use(helmet.hidePoweredBy());
app.use(helmet.noSniff());
app.use(helmet.ieNoOpen());
app.use(helmet.dnsPrefetchControl());
app.use(helmet.permittedCrossDomainPolicies());

// Prevent browser from caching sensitive information
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

app.use(
  morgan(!IS_DEVELOPMENT ? "combined" : "dev", {
    stream,
  }),
);

const PORT = ENVIRONMENT.APP.PORT;
const APP_NAME = ENVIRONMENT.APP.NAME;
await connectDb();

const server = app.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${ENVIRONMENT.APP.ENV}`);
  logger.info(`App name: ${APP_NAME}`);
});

app.use("/api/v1/health-check", (req, res) => {
  res.status(200).json({
    success: true,
    data: null,
    message: "Health check successful",
  });
});

app.all("/*splat", (req, res) => {
  logger.error(
    `Route ${req.method.toUpperCase()}: ${req.url} not found. Check documentation for more details`,
  );
  res.status(404).json({
    success: false,
    data: null,
    message: `Route ${req.method.toUpperCase()} : ${req.url} not found. Check documentation for more details`,
  });
});
app.use(errorHandler);

process.on("unhandledRejection", async (error: Error) => {
  logger.error(
    "UNHANDLED REJECTION! 💥 Server Shutting down... " +
      new Date(Date.now()) +
      error,
  );
  server.close(() => {
    process.exit(1);
  });
});

process.on("uncaughtException", async (error: Error) => {
  logger.error(
    "UNCAUGHT EXCEPTION!! 💥 Server Shutting down... " +
      new Date(Date.now()) +
      error,
  );
  process.exit(1);
});

process.on("SIGTERM", () => {
  server.close(() => {
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  server.close(() => {
    process.exit(0);
  });
});
