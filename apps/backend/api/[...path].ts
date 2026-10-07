import type { Request, Response } from "express";
import { createApplication } from "../src/create-application";

let application: ReturnType<typeof createApplication> | undefined;

export default async function handler(request: Request, response: Response) {
  application ??= createApplication().then(async (app) => {
    await app.init();
    return app;
  });

  const app = await application;
  app.getHttpAdapter().getInstance()(request, response);
}
