import "../src/instrument";
import type { INestApplication } from "@nestjs/common";
import type { Request, Response } from "express";

import { createHttpApplication } from "../src/create-app";

let application: Promise<INestApplication> | undefined;

async function getApplication(): Promise<INestApplication> {
  application ??= createHttpApplication().then(async (app) => {
    await app.init();
    return app;
  });
  return application;
}

export default async function handler(request: Request, response: Response): Promise<void> {
  const app = await getApplication();
  app.getHttpAdapter().getInstance()(request, response);
}
