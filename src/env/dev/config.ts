import * as path from "path";

export const CORS = true;
export const WEB_SERVER_PORT = process.env.PORT || 5000;
export const WEB_SERVER_HOST = process.env.HOST || "0.0.0.0";
export const PUBLIC_FOLDER = path.resolve("./public");
