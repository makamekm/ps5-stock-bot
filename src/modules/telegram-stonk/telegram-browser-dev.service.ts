import { Injectable } from "@nestjs/common";
import puppeteer from "puppeteer";
import { Context, Command } from "nestjs-telegraf";
import { OnlyDev } from "./only-dev.decorator";
import { BrowserCookieSessionService } from "./browser-cookie-session.service";
import { USER_FOLDER } from "@env/config";

@Injectable()
export class TelegramStonkBrowserDevService {
  constructor(
    private browserCookieSessionService: BrowserCookieSessionService
  ) {}

  private browser: puppeteer.Browser;
  private page: puppeteer.Page;

  @Command("localstart")
  @OnlyDev
  async start(ctx: Context) {
    this.browser = await puppeteer.launch({
      headless: false,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      userDataDir: USER_FOLDER,
    });
    this.page = await this.browser.newPage();
    await this.page.goto(
      "https://www.amazon.co.uk/PlayStation-9395003-5-Console/dp/B08H97NYGP/ref=sr_1_1?crid=271VIQXZF60UW&dchild=1&keywords=playstation%2B5&qid=1608296112&sprefix=play%2Caps%2C192&sr=8-1&th=1"
    );
    ctx.reply("Browser has been opened!");
  }

  @Command("localsavecookie")
  @OnlyDev
  async saveCookie(ctx: Context) {
    if (this.browser == null) {
      ctx.reply("Run /localstart first!");
      return;
    }
    const saveSessionResult = await this.browserCookieSessionService.saveCookieSession(
      this.page
    );
    if (saveSessionResult) {
      ctx.reply("Session has been successfully saved!");
    } else {
      ctx.reply("The file could not be written!");
    }
  }

  @Command("localsave")
  @OnlyDev
  async save(ctx: Context) {
    if (this.browser != null) {
      ctx.reply("Run /localstop first!");
      return;
    }
    const saveSessionResult = await this.browserCookieSessionService.saveSession();
    if (saveSessionResult) {
      ctx.reply("Session has been successfully saved!");
    } else {
      ctx.reply("The file could not be written!");
    }
  }

  @Command("localstop")
  @OnlyDev
  async stop(ctx: Context) {
    if (this.browser == null) {
      ctx.reply("Run /localstart first!");
      return;
    }
    this.browser.close();
    this.browser = null;
    ctx.reply("Browser has been closed!");
  }

  @Command("localrestore")
  @OnlyDev
  async restore(ctx: Context) {
    if (this.browser != null) {
      ctx.reply("Run /localstop first!");
      return;
    }
    const restoreSessionResult = await this.browserCookieSessionService.restoreSession();
    if (restoreSessionResult) {
      await this.page.reload();
      ctx.reply("Cookies has been restored successfully!");
    } else {
      ctx.reply("Failed to restore cookies!");
    }
  }

  @Command("localrestorecookie")
  @OnlyDev
  async restoreCookie(ctx: Context) {
    if (this.browser == null) {
      ctx.reply("Run /localstart first!");
      return;
    }
    const restoreSessionResult = await this.browserCookieSessionService.restoreCookieSession(
      this.page
    );
    if (restoreSessionResult) {
      await this.page.reload();
      ctx.reply("Cookies has been restored successfully!");
    } else {
      ctx.reply("Failed to restore cookies!");
    }
  }
}
