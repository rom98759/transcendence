import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../utils/logger.js';
import { fetchOptions } from '../utils/mtlsAgent.js';

const SERVICES: Record<string, { host: string; port: number }> = {
  auth: { host: 'auth-service', port: 3001 },
  user: { host: 'user-service', port: 3002 },
  game: { host: 'game-service', port: 3003 },
  blockchain: { host: 'blockchain-service', port: 3005 },
};

export async function healthHandler(request: FastifyRequest, reply: FastifyReply) {
  return { status: 'healthy' };
}

export async function healthByNameHandler(req: FastifyRequest, reply: FastifyReply) {
  const { name } = req.params as { name: string };
  const service = SERVICES[name];

  if (!service) {
    req.log.warn({ event: 'health_check_service_not_found', serviceName: name });
    return reply.code(404).send({
      error: { message: 'Service not found', code: 'SERVICE_NOT_FOUND' },
    });
  }

  try {
    const res = await fetch(`https://${service.host}:${service.port}/health`, fetchOptions);
    const healthy = res.status === 200;

    req.log.info({
      event: 'health_check_service',
      serviceName: name,
      healthy,
      status: res.status,
    });

    if (healthy) {
      return { status: 'healthy' };
    }
    return reply.code(500).send({ status: 'unhealthy' });
  } catch (error) {
    req.log.error({
      event: 'health_check_service_error',
      serviceName: name,
      err: (error as Error).message,
    });
    return reply.code(500).send({
      status: `unhealthy (error: ${(error as Error).message})`,
    });
  }
}

export async function healthAllHandler(req: FastifyRequest, reply: FastifyReply) {
  const results: Record<string, string> = {};

  await Promise.all(
    Object.entries(SERVICES).map(async ([name, service]) => {
      try {
        const res = await fetch(`https://${service.host}:${service.port}/health`, fetchOptions);
        results[name] = res.status === 200 ? 'healthy' : 'unhealthy';
      } catch (error) {
        results[name] = `unhealthy (error: ${(error as Error).message})`;
      }
    }),
  );

  req.log.info({ event: 'health_check_all', services: results });
  return results;
}
