import * as path from "path";

export const CORS = false;
export const WEB_SERVER_PORT = process.env.PORT || 8080;
export const WEB_SERVER_HOST = process.env.HOST || "0.0.0.0";
// export const PUBLIC_FOLDER = path.resolve(__dirname, "../../../", "./public");
export const PUBLIC_FOLDER = path.resolve("./public");
