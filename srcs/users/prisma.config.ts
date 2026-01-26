import path from 'node:path';
import { appenv } from './src/config/env';

import { defineConfig } from 'prisma/config';

// const isDocker = process.env.IS_DOCKER === 'true' || path.resolve('/').startsWith('/app');

export default defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  migrations: {
    path: path.join(__dirname, 'prisma', 'migrations'),
  },
  datasource: {
    url: appenv.UM_DB_URL,
  },
});
