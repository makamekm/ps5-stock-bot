import { MiddlewareConsumer, Module, RequestMethod } from "@nestjs/common";
import { ServeStaticModule } from "@nestjs/serve-static";
import { PUBLIC_FOLDER } from "@env/config";
import { NextMiddleware, NextModule } from "@nestpress/next";
import { NextController } from "./next.controller";
import { FrontendMiddleware } from "./frontend.middleware";
import { TelegrafModule } from "nestjs-telegraf";
import { TelegramStonkModule } from "./modules/telegram-stonk/telegram-stonk.module";
import { ScheduleModule } from "@nestjs/schedule";
import { TELEGRAM_BOT_KEY } from "@env/config";

@Module({
  imports: [
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
      .exclude("api/(.*)", "asset/(.*)")
      .forRoutes({
        path: "*",
        method: RequestMethod.GET,
      });
  }
}
