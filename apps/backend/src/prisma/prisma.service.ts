import {
  Injectable,
  OnModuleInit,
  BeforeApplicationShutdown,
  Logger,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, BeforeApplicationShutdown
{
  private readonly logger = new Logger(PrismaService.name);
  private connected = false;

  async onModuleInit() {
    try {
      await this.$connect();
      this.connected = true;
      this.logger.log("✅ Connected to PostgreSQL database successfully");
    } catch (err: any) {
      this.connected = false;
      if (process.env.NODE_ENV === 'production') throw err;
      this.logger.warn(
        "⚠️  PostgreSQL not available on localhost:5432. Backend started in DEMO MODE (API will return fallback data / errors if DB is needed).\n" +
          "   To enable full CRUD + seed data, start PostgreSQL and run: npm run prisma:migrate && npm run seed\n" +
          "   Error: " +
          (err?.message || "Unknown"),
      );
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async beforeApplicationShutdown() {
    // Background services drain their active jobs in onModuleDestroy first.
    if (this.connected) {
      try {
        await this.$disconnect();
      } catch {
        /* ignore */
      }
    }
  }
}
