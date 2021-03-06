import * as path from "path";
import os from "os";

export const CORS = true;
export const WEB_SERVER_PORT = process.env.PORT || 5000;
export const WEB_SERVER_HOST = process.env.HOST || "0.0.0.0";
export const PUBLIC_FOLDER = path.resolve("./public");
export const USER_FOLDER = path.resolve("./user_data");
export const TEMP_FOLDER = path.resolve("./temp_data");
export const COOKIES_PATH = path.resolve("./cookies.json");
export const COOKIES_DROPBOX_PATH = "/cookies.json";
export const SUBSCRIPTIONS_DROPBOX_PATH = "/subs_dev.json";
export const USER_FOLDER_DROPBOX_PATH = "/user_data.zip";
export const TELEGRAM_BOT_KEY = process.env.TELEGRAM_BOT_KEY;
export const DROPBOX_KEY = process.env.DROPBOX_KEY;
export const DROPBOX_CACHE_TTL = 1000 * 60 * 60 * 24;
export const ADMIN_USERNAMES = ["maximkarpov"];
export const ADMIN_CHATIDS = [453569878];
export const SHOW_LOCAL = true;
export const BROWSER_PATH =
  process.env.BROWSER || (os.arch() === "arm" ? "chromium" : undefined);
export const BROWSER_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  // RASPBERRY
  ...(os.arch() === "arm"
    ? [
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-accelerated-2d-canvas",
      ]
    : []),
];
export const BROWSER_URL = process.env.BROWSER_URL;
