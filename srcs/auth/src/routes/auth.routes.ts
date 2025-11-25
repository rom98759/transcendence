import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { meHandler, loginHandler, registerHandler, logoutHandler, listAllUsers, verify2FAHandler, enable2FAHandler, disable2FAHandler, get2FAStatusHandler } from "../controllers/auth.controller.js";

export async function authRoutes(app: FastifyInstance) {
  app.get("/", async function (this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
    return { message: "Auth service is running" };
  });

  app.get("/health", async function (this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
    return reply.code(200).send({ status: "healthy" });
  });

  app.post("/register", registerHandler);

  app.post("/login", loginHandler);

  app.post("/verify-2fa", verify2FAHandler);

  app.post("/logout", logoutHandler);

  // 2FA management routes
  app.get("/2fa/status", get2FAStatusHandler);
  app.post("/2fa/enable", enable2FAHandler);
  app.post("/2fa/disable", disable2FAHandler);

  // DEV ONLY - À supprimer en production
  app.get("/me", meHandler);

  app.get("/list", listAllUsers);
}
