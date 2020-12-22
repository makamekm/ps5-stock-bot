import { NestFactory } from "@nestjs/core";
import * as path from "path";
import { AppModule } from "./app.module";
import { CORS } from "@env/config";
import { NextModule } from "@nestpress/next";

export async function bootstrapAPI() {
  const app = await NestFactory.create(AppModule, { cors: CORS });
  const port = process.env.PORT || 5000;

  app
    .get(NextModule)
    .prepare({
      dir: path.resolve(process.cwd()),
      quiet: false,
      conf: {
        webpack: (config, _options) => {
          config.resolve.plugins[0].paths["@env/*"] = [
            `./src/env/${process.env.MAIN_ENV || process.env.ENV || "prod"}/*`,
          ];
          return config;
        },
      },
    })
    .then(() => {
      app.listen(port, () => {
        console.log("Server is listening...", port);
      });
    });
}
