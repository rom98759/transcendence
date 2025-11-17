import fastify from "fastify";
import fastifyCors from "@fastify/cors";
import { gatewayNonApiRoutes, gatewayRoutes } from "./routes/gateway.routes.js";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";

const PUBLIC_ROUTES = ["/api/auth/login", "/api/auth/register", "/api/auth/health"];

const app = fastify({ logger: { level: process.env.LOG_LEVEL || "info" } });

// Register fastify-cookie
app.register(fastifyCookie);

// Register fastify-jwt
app.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || "supersecretkey",  // USE Hashicorp Vault ------------------------------------
});

// Hook verify JWT routes `/api` sauf les routes PUBLIC_ROUTES
app.addHook("onRequest", async (request: any, reply: any) => {
  const url = request.url || request.raw?.url || "";

  // Routes public non `/api` : on ne fait rien
  if (!url.startsWith("/api")) return;

  // Routes publiques juste `/api/auth/login` et `/api/auth/register` (pas de cookie nécessaire)
  if (PUBLIC_ROUTES.includes(url)) return;

  const token = request.cookies && (request.cookies.token as string | undefined);

  // No token present
  if (!token) {
    app.log.warn({ event: "jwt_missing", url: request.url });
    return reply
      .code(401)
      .send({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
  }

  // Verify JWT token
  try {
    const decoded = app.jwt.verify(token);
    request.user = decoded; // injecte user dans la requête (username, id, etc.)
  } catch (err: any) {
    app.log.warn({
      event: "jwt_verify_failed",
      message: err?.message,
      url: request.url,
    });
    return reply
      .code(401)
      .send({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
  }
});

// preHandler ajouter header interne : x-user-name (username dans DB) + x-user-id (id dans DB)
app.addHook("preHandler", async (request: any, reply: any) => {
  if (request.user) {
    const username = (request.user as any).username || null;
    const id = (request.user as any).sub || (request.user as any).id || null;
    if (username)
      reply.header("x-user-name", username);
    if (id !== null && id !== undefined)
      reply.header("x-user-id", String(id));
  }
});

// Décorateur requêtes internes : ajoute automatiquement
// header `x-user-name` + `x-user-id` + cookies de fetchInternal dans proxyRequest
app.decorate("fetchInternal", async (request: any, url: string, init: any = {}) => {
    const userName = request.user?.username || request.headers["x-user-name"] || "";
    const userId = request.user?.sub || request.user?.id || request.headers["x-user-id"] || "";

    const headers = Object.assign({}, init.headers || {}, {
      "x-user-name": userName,
      "x-user-id": String(userId),
      cookie: request.headers?.cookie || "",
    });

    return fetch(url, Object.assign({}, init, { headers }));
  }
);

// Log request end
app.addHook("onResponse", async (request: any, reply: any) => {
  app.log.info({
    event: "request_end",
    method: request.method,
    url: request.url,
    status: reply.statusCode,
    user: request.user?.username || null,
  });
});

// Central error handler: structured errors
app.setErrorHandler((error: any, request: any, reply: any) => {
  app.log.error({
    event: "unhandled_error",
    message: error?.message,
    stack: error?.stack,
    url: request?.url,
    method: request?.method,
    user: request?.user?.username || null,
  });
  const status = error?.statusCode || 500;
  const payload: any = {
    error: {
      message: status === 500 ? "Internal server error" : error?.message,
      code: error?.code || "INTERNAL_ERROR",
    },
  };
  if (process.env.NODE_ENV === "development")
    payload.error.details = { stack: error?.stack };
  reply.code(status).send(payload);
});

// Disable cors sauf nginx devant
// Allow credentials forward/set cookies (JWT) auth service.
app.register(fastifyCors, {
  // allow localhost:8000 and file:// (origin === null). Don't use wildcard if credentials=true.
  origin: (origin, cb) => {
    // allow requests with no origin (e.g., file:// => origin is null)
    if (!origin) return cb(null, true);
    // allow localhost origins (adjust if you serve UI from another host/port)
    if (
      origin.startsWith("http://localhost") ||
      origin.startsWith("http://127.0.0.1")
    )
      return cb(null, true);
    // otherwise deny
    cb(new Error("Not allowed"), false);
  },
  credentials: true,
});

// Register routes
app.register(gatewayRoutes, { prefix: "/api" });
app.register(gatewayNonApiRoutes);

// Start the server
app.listen({ port: 3000, host: "0.0.0.0" }, (err?: Error, address?: string) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});
