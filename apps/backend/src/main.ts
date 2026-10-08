import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { configureApplication } from "./create-application";

async function bootstrap() {
  const app = await configureApplication(await NestFactory.create(AppModule));
  app.enableShutdownHooks();

  const port = parseInt(process.env.PORT || "4000", 10) || 4000;
  const net = await import("net");
  function portAvailable(p: number): Promise<number> {
    return new Promise((res) => {
      const server = net.createServer();
      server.unref();
      server.on("error", () => res(portAvailable(p + 1)));
      server.listen(p, () => server.close(() => res(p)));
    });
  }
  // A production orchestrator must fail fast when its assigned port is busy;
  // silently moving to another port makes the load balancer health-check the
  // wrong process. Auto-increment is kept only for local development.
  const listenPort =
    process.env.NODE_ENV === "production" ? port : await portAvailable(port);
  await app.listen(listenPort);
  // A 2GB backup upload can legitimately take much longer than Node's default
  // request timeout on slower private networks.
  app.getHttpServer().requestTimeout = 2 * 60 * 60 * 1000;
  console.log(`\n🟢 BACKEND RUNNING on http://localhost:${listenPort}/api`);
  console.log(
    `📚 API Docs (Swagger): http://localhost:${listenPort}/api/docs\n`,
  );
}
bootstrap();
