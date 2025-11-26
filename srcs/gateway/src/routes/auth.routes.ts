import { FastifyInstance } from "fastify";
import {
  authRootHandler,
  authHealthHandler,
  meHandler,
  loginHandler,
  registerHandler,
  logoutHandler,
  listHandler,
  verify2FAHandler,
  enable2FAHandler,
  disable2FAHandler,
  get2FAStatusHandler
} from "../controllers/auth.controller.js";

export async function authRoutes(app: FastifyInstance) {
  app.get("/", authRootHandler);
  app.get("/health", authHealthHandler);

  // Routes d'authentification
  app.post("/register", registerHandler);
  app.post("/login", loginHandler);
  app.post("/verify-2fa", verify2FAHandler);
  app.post("/logout", logoutHandler);

  // Routes de gestion 2FA
  app.get("/2fa/status", get2FAStatusHandler);
  app.post("/2fa/enable", enable2FAHandler);
  app.post("/2fa/disable", disable2FAHandler);

  // DEV ONLY - À supprimer en production
  app.get("/me", meHandler);
  app.get("/list", listHandler);
}
