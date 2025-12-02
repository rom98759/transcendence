import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { meHandler, loginHandler, registerHandler, logoutHandler, verifyHandler, listAllUsers, notFoundHandler } from "../controllers/auth.controller.js";

export async function authRoutes(app: FastifyInstance) {
  app.get("/", async function (this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
    return { message: "Auth service is running" };
  });

  app.get("/health", async function (this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
    return reply.code(200).send({ status: "healthy" });
  });

  app.post("/register", registerHandler);

  app.post("/login", loginHandler);

  app.post("/logout", logoutHandler);

  app.get("/verify", verifyHandler);

  // DEV ONLY - À supprimer en production
  app.get("/me", meHandler);

  app.get("/list", listAllUsers);

  // Gestion des routes inconnues (doit être en dernier)
  app.all("/*", notFoundHandler);
}
