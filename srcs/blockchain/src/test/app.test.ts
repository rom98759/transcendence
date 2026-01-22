import { describe, afterAll, expect, test } from 'vitest';
import supertest from 'supertest';

import {
  badtournamentData,
  tournamentData,
  tournamentsData,
  tournamentBlockData,
} from './mockData.js';
import { buildApp } from '../app.js';
import * as db from '../core/database.js';
import { parse } from 'node:path';

const blockchainReady = process.env.BLOCKCHAIN_READY === 'true';
const app = await buildApp();

describe('TEST blockchain without Smart Contract', () => {
  test('Blockchain page respond', async () => {
    await app.ready();
    await supertest(app.server).get('/').expect(200);
  });

  test('with HTTP injection: GET list Tournament', async () => {
    db.truncateSnapshot();
    for (const data of tournamentsData) {
      await app.inject({
        method: 'POST',
        url: '/tournaments',
        body: data,
      });
    }
    const response = await app.inject({
      method: 'GET',
      url: '/tournaments',
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    for (let i = 0; i < tournamentsData.length; i++) {
      const tournament = body[i];
      expect(tournament).toBeDefined();
      expect(tournament.tour_id).toBe(tournamentsData[i].tour_id);
      expect(tournament.player1).toBe(tournamentsData[i].player1);
      expect(tournament.player2).toBe(tournamentsData[i].player2);
      expect(tournament.player3).toBe(tournamentsData[i].player3);
      expect(tournament.player4).toBe(tournamentsData[i].player4);
    }
  });

  test('with HTTP injection: GET a Tournament', async () => {
    db.truncateSnapshot();
    await app.inject({
      method: 'POST',
      url: '/tournaments',
      body: tournamentData,
    });
    const response = await app.inject({
      method: 'GET',
      url: '/tournaments/5',
    });
    expect(response.statusCode).toBe(200);
    const html = response.payload;
    expect(html).toContain('<title>Tournament details</title>');
  });

  test('with HTTP injection: POST bad data', async () => {
    db.truncateSnapshot();
    const response = await app.inject({
      method: 'POST',
      url: '/tournaments',
      body: badtournamentData,
    });

    expect(response.statusCode).toBe(400);
    const body = response.json() as any;
    expect(body.code).toBe('FST_ERR_VALIDATION');
    expect(body.validation?.[0]?.message).toBe("must have required property 'tour_id'");
    expect(body.validationContext).toBe('body');
  });

  test('with HTTP injection: POST duplicate data', async () => {
    db.truncateSnapshot();
    await app.inject({
      method: 'POST',
      url: '/tournaments',
      body: tournamentData,
    });
    const response = await app.inject({
      method: 'POST',
      url: '/tournaments',
      body: tournamentData,
    });

    expect(response.statusCode).toBe(406);
    const body = response.json() as any;
    expect(body.error.code).toBe('TOURNAMENT_EXISTS');
    expect(body.error.message).toContain('is already taken');
  });

  test('with HTTP injection: POST good data without active Smart Contract', async () => {
    db.truncateSnapshot();
    const response = await app.inject({
      method: 'POST',
      url: '/tournaments',
      body: tournamentData,
    });
    if (!blockchainReady) expect(response.statusCode).toBe(200);
    else expect(response.statusCode).toBe(406);
  });
});

describe.runIf(blockchainReady)('TEST blockchain with Smart Contract', () => {
  test('with HTTP injection: POST good data with active Smart Contract', async () => {
    db.truncateSnapshot();
    const response = await app.inject({
      method: 'POST',
      url: '/tournamentspub',
      body: tournamentBlockData,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as any;
    expect(body.status).toBe('published');
  });
});

afterAll(async () => {
  await app.close();
});
