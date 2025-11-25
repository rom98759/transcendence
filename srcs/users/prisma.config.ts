import { appenv } from "../users/src/config";

import { defineConfig } from "prisma/config";

export default defineConfig({
    schema: './data/prisma/schema.prisma',
    migrations: {
        path: 'prisma/migrations',
    },
    datasource: {
        url: appenv.UM_DB_URL
    },
})