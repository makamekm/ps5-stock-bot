import { Module } from "@nestjs/common";
import { TelegramModule } from "nestjs-telegram";
import { TelegramStonkService } from "./telegram-stonk.service";
import { TELEGRAM_BOT_KEY } from "@env/config";
import { TelegramScraperService } from "./telegram-scraper.service";
import { DropboxCacheService } from "./dropbox-cache.service";
import { BrowserCookieSessionService } from "./browser-cookie-session.service";
import { TelegramLocalBrowserService } from "./telegram-local-browser.service";
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
    TelegramScraperService,
    DropboxCacheService,
    BrowserCookieSessionService,
    TelegramLocalBrowserService,
    TelegramActionService,
    TelegramFetchService,
  ],
})
export class TelegramStonkModule {}
