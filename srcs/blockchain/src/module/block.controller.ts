import { db } from "../core/database.js";
import { RecordNotFoundError } from "../core/error.js";
import { FastifyReply, FastifyRequest } from "fastify";

export async function listRows(_request: FastifyRequest, reply: FastifyReply) {
  const datadb = db.prepare("SELECT * FROM snapshot").all();
  return reply.view("index", {
    title: "Blockchain Service",
    message: "Hello from Fastify + EJS + TypeScript",
    datadb,
  });
}

export async function listRowsJSON(_request: FastifyRequest, reply: FastifyReply) {
  const datadb = db.prepare("SELECT * FROM snapshot").all();
  return reply.code(200).send(datadb);
}

export async function showRow(
  request: FastifyRequest<{ Params: { id: number } }>,
  reply: FastifyReply,
) {
  const datadb = db
    .prepare(`SELECT * FROM snapshot WHERE id = ?`)
    .get(request.params.id);
  if (datadb === undefined) {
    throw new RecordNotFoundError(`No data with id ${request.params.id}`);
  }
  return reply.view("data", {
    title: "My data is",
    message: "My data is",
    datadb,
  });
}

export async function addRow(
  req: FastifyRequest<{
    Body: {
      id: number;
      first_name: string;
      last_name: string;
    };
  }>,
  res: FastifyReply,
) {
  const data = req.body;
  db.prepare(
    `INSERT INTO snapshot(id,first_name,last_name) VALUES (?,?,?)`,
  ).run(data.id, data.first_name, data.last_name);
  return res.redirect("/");
}
