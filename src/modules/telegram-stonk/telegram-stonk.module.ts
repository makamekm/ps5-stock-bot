import { Module } from "@nestjs/common";
import { TelegramModule } from "nestjs-telegram";
import { TelegramStonkService } from "./telegram-stonk.service";
import { TELEGRAM_BOT_KEY } from "@env/config";
import { TelegramStonkScreenshotService } from "./telegram-screenshot.service";
import { DropboxCacheService } from "./dropbox-cache.service";
import { BrowserCookieSessionService } from "./browser-cookie-session.service";
import { TelegramStonkBrowserDevService } from "./telegram-browser-dev.service";
import { TelegramActionService } from "./telegram-action.service";
import { TelegramFetchService } from "./telegram-fetch.service";

@Module({
  imports: [
    TelegramModule.forRoot({
      botKey: TELEGRAM_BOT_KEY,
    }),
  ],
  controllers: [],
  providers: [
    TelegramStonkService,
    TelegramStonkScreenshotService,
    DropboxCacheService,
    BrowserCookieSessionService,
    TelegramStonkBrowserDevService,
    TelegramActionService,
    TelegramFetchService,
  ],
})
export class TelegramStonkModule {}
