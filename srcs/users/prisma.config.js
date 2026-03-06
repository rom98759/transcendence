import path from 'node:path';

const ROOT_DIR = process.env.NODE_ENV === 'production' ? '/app' : process.cwd();

export default {
  schema: path.join(ROOT_DIR, 'prisma', 'schema.prisma'),
  migrations: {
    path: path.join(ROOT_DIR, 'prisma', 'migrations'),
  },
  datasource: {
    url: process.env.UM_DB_URL,
  },
};
