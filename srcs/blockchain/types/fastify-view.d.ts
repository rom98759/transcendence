import "@fastify/view";

declare module "fastify" {
  interface FastifyReply {
    view: (
      template: string,
      data?: Record<string, unknown>,
    ) => ReturnType<this["send"]>;
  }
}
