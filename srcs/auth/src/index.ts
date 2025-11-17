import fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import { authRoutes } from './routes/auth.routes.js';

const app = fastify({ logger: { level: process.env.LOG_LEVEL || 'info'} });

// Register shared plugins once
app.register(fastifyCookie);
app.register(fastifyJwt, { secret: process.env.JWT_SECRET || 'supersecretkey' });

app.register(authRoutes, { prefix: '/' });

app.listen({ port: 3001 }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Auth service listening at ${address}`);
});