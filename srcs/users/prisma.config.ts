import path from 'node:path';
import { appenv } from './src/config/env';

import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  migrations: {
    path: path.join(__dirname, 'prisma', 'migrations'),
  },
  datasource: {
    url: appenv.UM_DB_URL,
  },
});
