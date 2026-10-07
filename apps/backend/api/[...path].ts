import type { Request, Response } from "express";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../src/app.module";
import { configureApplication } from "../src/create-application";

let application: ReturnType<typeof configureApplication> | undefined;

export default async function handler(request: Request, response: Response) {
  application ??= NestFactory.create(AppModule)
    .then(configureApplication)
    .then(async (app) => {
      await app.init();
      return app;
    });

  const app = await application;
  app.getHttpAdapter().getInstance()(request, response);
}
