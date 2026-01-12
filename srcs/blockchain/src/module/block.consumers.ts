import { FastifyInstance } from 'fastify';

export async function startTournamentConsumer(app: FastifyInstance) {
  if (!app.redis) {
    app.log.warn('Redis not available, tournament consumer disabled');
    return;
  }
  const redis = app.redis;

  try {
    await redis.xgroup('CREATE', 'tournament.results', 'blockchain-group', '$', 'MKSTREAM');
  } catch (e) {
    // group already exists → OK
  }

  const consume = async () => {
    while (!app.closing) {
      const streams = await redis.xreadgroup(
        'GROUP',
        'blockchain-group',
        'blockchain-1',
        'BLOCK',
        5000,
        'COUNT',
        1,
        'STREAMS',
        'tournament.results',
        '>',
      );

      if (!streams) continue;

      const [[, messages]] = streams;
      for (const [id, fields] of messages) {
        const payload = JSON.parse(fields[1]);

        // 1. validation
        // 2. écriture blockchain
        // 3. ack
        await redis.xack('tournament.results', 'blockchain-group', id);
      }
    }
  };

  consume();
}
