import formbody from "@fastify/formbody";
import fp from "fastify-plugin";

export default fp(async (app) => {
  app.register(formbody);
});
