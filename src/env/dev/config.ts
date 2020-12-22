import * as path from "path";

export const CORS = true;
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
export const SHOW_LOCAL = true;
