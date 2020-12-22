import { MiddlewareConsumer, Module, RequestMethod } from "@nestjs/common";
import { ServeStaticModule } from "@nestjs/serve-static";
import { PUBLIC_FOLDER } from "@env/config";
import { NextMiddleware, NextModule } from "@nestpress/next";
import { NextController } from "./next.controller";
import { FrontendMiddleware } from "./frontend.middleware";
import { StatusMonitorModule } from "nest-status-monitor";
import { TelegrafModule } from "nestjs-telegraf";
import { TelegramStonkModule } from "./modules/telegram-stonk/telegram-stonk.module";
import { ScheduleModule } from "@nestjs/schedule";
import { TELEGRAM_BOT_KEY } from "@env/config";

const port = Number(process.env.PORT) || 5000;

@Module({
  imports: [
    StatusMonitorModule.setUp({
      pageTitle: "PS4 Stock Bot Monitoring Page",
      port: port,
      path: "/status",
      ignoreStartsWith: "/health/alive",
      spans: [
        {
          interval: 1, // Every second
          retention: 60, // Keep 60 datapoints in memory
        },
        {
          interval: 5, // Every 5 seconds
          retention: 60,
        },
        {
          interval: 15, // Every 15 seconds
          retention: 60,
        },
      ],
      chartVisibility: {
        cpu: true,
        mem: true,
        load: true,
        responseTime: true,
        rps: true,
        statusCodes: true,
      },
      healthChecks: [
        {
          protocol: "http",
          host: "localhost",
          path: "/api/v1/transaction/ping",
          port: port,
        },
      ],
    }),
    NextModule,
    TelegrafModule.forRoot({
      token: TELEGRAM_BOT_KEY,
    }),
    ServeStaticModule.forRoot({
      rootPath: PUBLIC_FOLDER,
      serveRoot: "/asset/",
      // renderPath: "/",
      // exclude: ["/api/*"],
    }),
    ScheduleModule.forRoot(),
    TelegramStonkModule,
  ],
  controllers: [NextController],
  providers: [],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    // handle scripts
    consumer.apply(NextMiddleware).forRoutes({
      path: "_next*",
      method: RequestMethod.GET,
    });

    // handle other assets
    consumer.apply(NextMiddleware).forRoutes({
      path: "images/*",
      method: RequestMethod.GET,
    });

    consumer.apply(NextMiddleware).forRoutes({
      path: "favicon.ico",
      method: RequestMethod.GET,
    });

    consumer
      .apply(FrontendMiddleware)
      .exclude("api/(.*)", "asset/(.*)", "status")
      .forRoutes({
        path: "*",
        method: RequestMethod.GET,
      });
  }
}
