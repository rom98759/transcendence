import { buildApp } from "./app.js";

// Fonction de démarrage
const start = async () => {
  const app = await buildApp();
  try {
    await app.listen({ port: 3005, host: "0.0.0.0" });
    app.log.info("Blockchain service running on http://localhost:3005");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
