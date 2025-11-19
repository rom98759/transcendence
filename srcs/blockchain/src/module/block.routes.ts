import { FastifyInstance } from "fastify";
import { rowIdSchema, bodySchema } from "./block.schema.js";
import { addRow, listRows, listRowsJSON, showRow } from "./block.controller.js";

export async function blockRoutes(app: FastifyInstance) {
  app.get("/", listRows);
  app.get("/me", listRowsJSON);
  app.post("/", { schema: { body: bodySchema } }, addRow);
  app.get("/row/:id", { schema: { params: rowIdSchema } }, showRow);
}
