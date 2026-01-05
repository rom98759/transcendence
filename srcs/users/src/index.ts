import { appenv } from './config/env.js';
import { buildApp } from './app.js';

const startServer = async () => {
  const app = await buildApp();

  if (appenv.NODE_ENV !== 'test') {
    app.listen(
      { host: '0.0.0.0', port: appenv.UM_SERVICE_PORT },
      (err: Error | null, address: string) => {
        if (err) {
          app.log.error({ message: err.message });
          process.exit(1);
        }
        app.log.info({ message: `User Management service listening at ${address}` });
      },
    );
  }
};

startServer();
