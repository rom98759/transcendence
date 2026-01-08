// import { db } from "../core/database.js";
import * as db from '../core/database.js';
import { errorEventMap, RecordNotFoundError } from '../core/error.js';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  addTournamentBlockchain,
  addTournamentSnapDB,
  updateTournamentSnapDB,
} from './block.service.js';
import { BlockTournamentInput, SnapshotRow } from './block.type.js';

export async function listTournamentView(_request: FastifyRequest, reply: FastifyReply) {
  const snapshots = db.listSnap();
  return reply.view('index', {
    title: 'Blockchain Service',
    message: "It's better when there's proof!",
    snapshots,
  });
}

export async function listTournament(_request: FastifyRequest, reply: FastifyReply) {
  const snapshots = db.listSnap();
  return reply.code(200).send(snapshots);
}

export async function getTournamentView(
  request: FastifyRequest<{ Params: { tour_id: number } }>,
  reply: FastifyReply,
) {
  const snapshot = db.getSnapTournament(request.params.tour_id) as SnapshotRow;
  if (snapshot === undefined) {
    throw new RecordNotFoundError(`No data with id ${request.params.tour_id}`);
  }
  return reply.view('snapshot-details', {
    title: 'Tournament details',
    message: 'proof of tournament',
    snapshot,
  });
}

export async function addTournament(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const data = request.body as BlockTournamentInput;
  try {
    const rowSnapId = addTournamentSnapDB(this.log, data);
    const blockchainReady = process.env.BLOCKCHAIN_READY === 'true';

    if (blockchainReady) {
      const dataStored = await addTournamentBlockchain(this.log, data, rowSnapId);
      updateTournamentSnapDB(this.log, dataStored);
      return reply.code(200).send(dataStored);
    }
  } catch (err: any) {
    const event = errorEventMap[err.code];
    if (event) {
      this.log.error({ event, err });
    } else {
      this.log.error({ event: 'unknown_error', err });
    }
    this.log.error({ tournament: data.tour_id, err: err?.message || err });
    return reply.code(406).send({ error: { message: err.message, code: err.code } });
  }
}
