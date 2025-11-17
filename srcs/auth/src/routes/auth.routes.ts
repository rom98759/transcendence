import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { registerRoutes as registerAuthRoutes } from "../controllers/auth.controller.js";

export async function authRoutes(app: FastifyInstance) {
  registerAuthRoutes(app);

   app.get("/", async function (this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
    return { message: "Auth service is running" };
  }
  );

  app.get("/health", async function (this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
    return reply.code(200).send({ status: "healthy" });
  }
  );
}
