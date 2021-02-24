import { MiddlewareConsumer, Module, RequestMethod } from "@nestjs/common";
import { ServeStaticModule } from "@nestjs/serve-static";
import { PUBLIC_FOLDER } from "@env/config";
import { NextMiddleware, NextModule } from "@nestpress/next";
import { NextController } from "./next.controller";
import { FrontendMiddleware } from "./frontend.middleware";
import { ScheduleModule } from "@nestjs/schedule";

@Module({
  imports: [
    NextModule,
    ServeStaticModule.forRoot({
      rootPath: PUBLIC_FOLDER,
      serveRoot: "/asset/",
      // renderPath: "/",
      // exclude: ["/api/*"],
    }),
    ScheduleModule.forRoot(),
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
