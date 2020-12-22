const path = require("path");
const tsConfig = require(path.resolve(__dirname, "tsconfig.json"));
const tsConfigPaths = require("tsconfig-paths");

process.env.CURRENT_ENV = process.env.MAIN_ENV || process.env.ENV || "prod";

tsConfig.compilerOptions.paths["@env/*"] = [
  `./src/env/${process.env.CURRENT_ENV}/*`,
];

tsConfigPaths.register({
  baseUrl: tsConfig.compilerOptions.baseUrl,
  paths: tsConfig.compilerOptions.paths,
});
