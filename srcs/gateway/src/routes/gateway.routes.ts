import { FastifyInstance } from "fastify";
import { registerRoutes } from "../controllers/auth.controller.js";

export async function gatewayRoutes(app: FastifyInstance) {
  app.register(registerRoutes, { prefix: "/auth" });
}

export async function gatewayNonApiRoutes(app: FastifyInstance) {
  app.get("/", async (request, reply) => {
	return { message: "Welcome to the Gateway API, check /help" };
  });

  app.get("/help", async (request, reply) => {
	return {
	  routes: {
		"/": "GET - Welcome message",
		"/help": "GET - This help message",
		"/healthAll": "GET - Health check all services",
		"/health/:name": "GET - Health check service by name",
		"/auth/health": "GET - Health check auth service",
		"/auth/me": "GET - Get current user info",
		"/auth/login": "POST - User login",
		"/auth/register": "POST - User registration",
		"/auth/logout": "POST - User logout"
	  }
	};
  });

  app.get("/health", async (request, reply) => {
    return { status: "healthy" };
  });

  app.get("/health/:name", async (request, reply) => {
    const { name } = request.params as { name: string };
    const services: Record<string, { host: string; port: number }> = {
      auth: { host: "localhost", port: 3001 },
      // Add other services as needed
    };
    const service = services[name];
    if (!service) {
      return reply.code(404).send({ error: { message: "Service not found", code: "SERVICE_NOT_FOUND" } });
    }
    try {
      const res = await fetch(`http://${service.host}:${service.port}/health`);
      if (res.status === 200) {
        return { status: "healthy" };
      } else {
        return reply.code(500).send({ status: "unhealthy" });
      }
    } catch (error) {
      return reply.code(500).send({ status: `unhealthy (error: ${(error as Error).message})` });
    }
  });

  app.get("/healthAll", async (request, reply) => {
    const services = [{ name: "localhost", port: 3000 } , { name: "localhost", port: 3001 }]; // Add other services as needed
    const results: Record<string, string> = {};
    await Promise.all(services.map(async (service) => {
      try {
        const res = await fetch(`http://${service.name}:${service.port}/health`);
        if (res.status === 200) {
          results[`${service.name}:${service.port}`] = "healthy";
        } else {
          results[`${service.name}:${service.port}`] = "unhealthy";
        }
      } catch (error) {
        results[`${service.name}:${service.port}`] = `unhealthy (error: ${(error as Error).message})`;
      }
    }));
    return results;
  });
}