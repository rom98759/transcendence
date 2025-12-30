// import { db } from "../core/database.js";
import * as db from "../core/database.js";
import { errorEventMap, RecordNotFoundError } from "../core/error.js";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { BlockTournamentInput, BlockTournamentStored } from "./block.schema.js";
import { storeTournament } from "./block.service.js";

export async function listTournamentView(_request: FastifyRequest, reply: FastifyReply) {
  const snapshots = db.listSnap();
  return reply.view('index', {
    title: 'Blockchain Service',
    message: 'Hello from Fastify + EJS + TypeScript',
    snapshots,
  })
}

export async function listTournament(_request: FastifyRequest, reply: FastifyReply) {
  const snapshots = db.listSnap();
  return reply.code(200).send(snapshots)
}

export async function getTournamentView(
  request: FastifyRequest<{ Params: { tx_id: number } }>,
  reply: FastifyReply,
) {
  const snapshots = db.getSnapTournament(request.params.tx_id)
  if (snapshots === undefined) {
    throw new RecordNotFoundError(`No data with id ${request.params.tx_id}`)
  }
  return reply.view('data', {
    title: 'My data is',
    message: 'My data is',
    snapshots,
  })
}

export async function addTournamentForm(this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
  const { tx_id, tour_id, player1_id, player2_id, player3_id, player4_id } =
    request.body as BlockTournamentInput;
  const rowId = db.insertSnapTournament(request.body as BlockTournamentInput);
  this.log.info({ event: "register_success", tx_id, tour_id, player1_id, player2_id, player3_id, player4_id, rowId });
  return reply.redirect('/')
}

export async function addTournament(this: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
  const { tx_id, tour_id, player1_id, player2_id, player3_id, player4_id } = request.body as BlockTournamentInput;
  this.log.info({ event: "snapshot_register_attempt", tx_id, tour_id, player1_id, player2_id, player3_id, player4_id});
  try {
    const rowSnapId = db.insertSnapTournament(request.body as BlockTournamentInput);
    this.log.info({ event: "snapshot_register_success", tx_id, tour_id, player1_id, player2_id, player3_id, player4_id, rowSnapId });
    
    const blockchainReady = process.env.BLOCKCHAIN_READY === "true";
    
    if (blockchainReady){
      this.log.info({ event: "blockchain_register_attempt", tx_id, tour_id, player1_id, player2_id, player3_id, player4_id});
      const tournament: BlockTournamentStored = await storeTournament(this.log, request.body as  BlockTournamentInput);
      const {date_confirmed, tx_hash} = tournament;
      this.log.info({ event: "blockchain_register_success", tx_id, tour_id, tx_hash});
      
      this.log.info({ event: "snapshot_update_attempt", tx_id, tour_id, tx_hash, date_confirmed });
      const rowBlockId = db.updateTournament(tx_id, tournament.tx_hash, tournament.date_confirmed);
      this.log.info({ event: "snapshot_update_success", tx_id, tour_id, tx_hash, date_confirmed, rowBlockId });
    }
  } catch (err: any) {
    const event = errorEventMap[err.code];
    if (event) {
      this.log.error({ event, err });
    } else {
      this.log.error({ event: 'unknown_error', err });
    }
    this.log.error({
      tx_id,
      tour_id,
      player1_id,
      player2_id,
      player3_id,
      player4_id,
      err: err?.message || err,
    })
    return reply
      .code(406)
      .send({ error: { message: err.message, code: err.code } })
  }
}

