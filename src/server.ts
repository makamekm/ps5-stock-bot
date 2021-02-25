import { NestFactory } from "@nestjs/core";
import * as path from "path";
import { AppModule } from "./app.module";
import { CORS, WEB_SERVER_PORT, WEB_SERVER_HOST } from "@env/config";
import { NextModule } from "@nestpress/next";

export const getNestConfig = () => ({
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
});

export async function bootstrapAPI() {
  const app = await NestFactory.create(AppModule, { cors: CORS });
  const port = WEB_SERVER_PORT;

  app
    .get(NextModule)
    .prepare(getNestConfig())
    .then(() => {
      app.listen(port, WEB_SERVER_HOST, () => {
        console.log("Server is listening...", port);
      });
    });
}
