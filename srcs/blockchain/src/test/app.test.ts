import { afterAll, expect, test } from 'vitest'
import supertest from 'supertest'

import { badtournamentData, tournamentData } from './mockData.js'
import app from '../app.js'
import * as db from "../core/database.js";

db.truncateSnapshot();


test('Blockchqin page respond', async () => {
  await app.ready()

  await supertest(app.server)
    .get('/blockchain')
    .expect(200)
})

test('with HTTP injection: GET List', async () => {
  const response = await app.inject({
    method: 'GET',
    url: '/list',
  })

  expect(response.statusCode).toBe(200)
})

test('with HTTP injection: POST bad data', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/register',
    body: badtournamentData,
  })

  expect(response.statusCode).toBe(400)
  const body = response.json() as any
  expect(body.code).toBe('FST_ERR_VALIDATION')
  expect(body.validation?.[0]?.message).toBe("must have required property 'tx_id'")
  expect(body.validationContext).toBe('body')
})
// test('with HTTP injection: POST good data', async () => {
//   const response = await app.inject({
//     method: 'POST',
//     url: '/register',
//     body: tournamentData,
//   })
//
//   expect(response.statusCode).toBe(406)
//   const body = response.json() as any
//   expect(body.error.code).toBe('DB_INSERT_TOURNAMENT_ERR')
//   expect(body.error.message).toContain("UNIQUE constraint failed")
// })

test('with HTTP injection: POST duplicate data', async () => {
  await app.inject({
    method: 'POST',
    url: '/register',
    body: tournamentData,
  })
  const response = await app.inject({
    method: 'POST',
    url: '/register',
    body: tournamentData,
  })

  expect(response.statusCode).toBe(406)
  const body = response.json() as any
  expect(body.error.code).toBe('DB_INSERT_TOURNAMENT_ERR')
  expect(body.error.message).toContain("UNIQUE constraint failed")
})

afterAll(async () => {
  await app.close()
})
