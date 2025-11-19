import { FastifyInstance } from "fastify";
import fastifyView from "./fastify-view.js";
import fastifyStatic from "./fastify-static.js";
import formbody from "./fastify-formbody.js";


export async function registerPlugins(app: FastifyInstance) {
  await app.register(fastifyView);
  await app.register(fastifyStatic);
  await app.register(formbody);
}
