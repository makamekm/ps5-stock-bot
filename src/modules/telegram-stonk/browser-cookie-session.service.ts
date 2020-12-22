import { Injectable } from "@nestjs/common";
import puppeteer from "puppeteer";
import fs from "fs";
import {
  COOKIES_PATH,
  DROPBOX_CACHE_TTL,
  USER_FOLDER,
  USER_FOLDER_DROPBOX_PATH,
} from "@env/config";
import { DropboxCacheService } from "./dropbox-cache.service";
import { Command, Context } from "nestjs-telegraf";
import { OnlyAdmins } from "./only-admin.decorator";

@Injectable()
export class BrowserCookieSessionService {
  constructor(private dropboxCacheService: DropboxCacheService) {}

  cookies: any[] = [];

  async readCookies(page: puppeteer.Page) {
    if (this.cookies.length !== 0) {
      for (let cookie of this.cookies) {
        await page.setCookie(cookie);
      }
    }
  }

  async restoreCookieSession(page: puppeteer.Page) {
    if (!this.hasCookieExpired()) {
      await this.readCookies(page);
      return true;
    }

    const hasDownloadedCookieSessionFromDropbox = await this.dropboxCacheService.readSessionFromDropbox();

    if (!hasDownloadedCookieSessionFromDropbox) {
      return false;
    }

    if (fs.existsSync(COOKIES_PATH)) {
      const cookiesString = fs.readFileSync(COOKIES_PATH, {
        encoding: "utf-8",
      });
      this.cookies = JSON.parse(cookiesString);
      await this.readCookies(page);
    }

    this.lastReadCookieSessionFromDropbox = +new Date();
    return true;
  }

  @Command("cleandropboxcookiessessioncache")
  @OnlyAdmins
  async cleanCookieCache(ctx: Context) {
    this.lastReadCookieSessionFromDropbox = Number.NEGATIVE_INFINITY;
    ctx.reply("Session has beed reset to Dropbox!");
  }

  lastReadCookieSessionFromDropbox = Number.NEGATIVE_INFINITY;
  ttlReadCookieSessionFromDropbox = DROPBOX_CACHE_TTL;

  hasCookieExpired() {
    return (
      this.lastReadCookieSessionFromDropbox +
        this.ttlReadCookieSessionFromDropbox <
      +new Date()
    );
  }

  lastReadSessionFromDropbox = Number.NEGATIVE_INFINITY;
  ttlReadSessionFromDropbox = DROPBOX_CACHE_TTL;

  hasExpired() {
    return (
      this.lastReadSessionFromDropbox + this.ttlReadSessionFromDropbox <
      +new Date()
    );
  }

  getUserDataPromise: Promise<void>;

  async restoreSession() {
    if (!this.hasExpired()) {
      return true;
    }

    if (this.getUserDataPromise) {
      await this.getUserDataPromise;
      return true;
    }

    let resolve: () => void;
    this.getUserDataPromise = new Promise((r) => (resolve = r));

    try {
      await this.dropboxCacheService.getFolder(
        USER_FOLDER,
        USER_FOLDER_DROPBOX_PATH
      );

      this.lastReadSessionFromDropbox = +new Date();
      return true;
    } catch (error) {
      console.error(error);
      console.error("Error loading user data");
      return false;
    } finally {
      if (resolve) {
        resolve();
        this.getUserDataPromise = null;
      }
    }
  }

  async saveSession() {
    return await this.dropboxCacheService.saveFolder(
      USER_FOLDER,
      USER_FOLDER_DROPBOX_PATH
    );
  }

  @Command("cleandropboxsessioncache")
  @OnlyAdmins
  async cleanCache(ctx: Context) {
    this.lastReadSessionFromDropbox = Number.NEGATIVE_INFINITY;
    ctx.reply("Session has beed reset to Dropbox!");
  }

  async saveCookieSession(page: puppeteer.Page) {
    const cookiesObject = await page.cookies();
    const saveSessionResult = await new Promise((r) =>
      fs.writeFile(COOKIES_PATH, JSON.stringify(cookiesObject), (err) => {
        if (err) {
          console.error(err);
          r(false);
        } else {
          r(true);
        }
      })
    );
    if (saveSessionResult) {
      return await this.dropboxCacheService.writeSessionToDropbox();
    }
    return false;
  }
}
