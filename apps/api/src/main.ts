import "./instrument";
import { Logger } from "@nestjs/common";

import { createHttpApplication } from "./create-app";

async function bootstrap() {
  const app = await createHttpApplication();
  app.enableShutdownHooks();
  const port = Number(process.env.PORT) || 4000;
  await app.listen(port);
  Logger.log(`API ready on http://localhost:${port}`, "Bootstrap");
}
bootstrap();
