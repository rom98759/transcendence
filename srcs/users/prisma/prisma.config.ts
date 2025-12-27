import path from 'path';
import { appenv } from '../src/config/env';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: path.join(__dirname, 'schema.prisma'),
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: appenv.UM_DB_URL,
  },
});
