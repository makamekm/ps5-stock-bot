import { Injectable } from "@nestjs/common";
import puppeteer from "puppeteer-extra";
import pup from "puppeteer";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import cheerio from "cheerio";
import { Context, Command, InjectBot, TelegrafProvider } from "nestjs-telegraf";
import { OnlyAdmins } from "./only-admin.decorator";
import { BrowserCookieSessionService } from "./browser-cookie-session.service";
import { TelegramStonkService } from "./telegram-stonk.service";
import { Cron } from "@nestjs/schedule";
import {
  MenuTemplate,
  MenuMiddleware,
  deleteMenuFromContext,
  createBackMainMenuButtons,
} from "telegraf-inline-menu";
import { TelegramActionService } from "./telegram-action.service";
import { USER_FOLDER, BROWSER_PATH } from "@env/config";
import { TelegramFetchService } from "./telegram-fetch.service";
import { LimitCron } from "./limit-cron.decorator";
import { ActionWithData } from "./telegram-action.decorator";
import { availibilityScenarious } from "./availability.scenarious";

@Injectable()
export class TelegramScraperService {
  constructor(
    @InjectBot() private bot: TelegrafProvider,
    private browserCookieSessionService: BrowserCookieSessionService,
    private telegramStonkService: TelegramStonkService,
    private telegramActionService: TelegramActionService,
    private telegramFetchService: TelegramFetchService
  ) {
    this.createReplyMenu();
  }

  createReplyMenu() {
    const menuReply = new MenuTemplate<Context>("Options");
    menuReply.interact("Screenshot", "screenshot", {
      do: async (ctx) => {
        await ctx.answerCbQuery("Loading!");
        await this.replyWithScreenshot(ctx.session.url, ctx);
        return true;
      },
    });

    const submenu = new MenuTemplate<Context>("Do you want to buy?");
    submenu.interact("Let's buy!", "buyprocess", {
      do: async (ctx) => {
        const session = ctx.session;
        ctx.session = {};
        await deleteMenuFromContext(ctx);
        await ctx.answerCbQuery("Buying...\n" + session.url);
        await this.buyAmazon(session.url, ctx);
        return true;
      },
    });
    submenu.manualRow(createBackMainMenuButtons("Cancel", null));
    menuReply.submenu("Buy", "buy", submenu, {
      hide: async (ctx) => {
        return ctx.session.type !== "amazon";
      },
    });

    menuReply.interact("Close", "close", {
      do: async (ctx) => {
        ctx.session = {};
        await deleteMenuFromContext(ctx);
        return false;
      },
    });

    this.menuReplyMiddleware = new MenuMiddleware("/replymenu/", menuReply);
    this.bot.use(this.menuReplyMiddleware);
  }

  menuReplyMiddleware: MenuMiddleware<Context>;

  async replyWithMenu(url: string, ctx: Context, type: "amazon" | null = null) {
    ctx.session = {
      url,
      type: type,
    };
    await this.menuReplyMiddleware.replyToContext(ctx, "/replymenu/");
  }

  @ActionWithData("menu")
  @OnlyAdmins
  async menu(ctx: Context, url: string) {
    return await this.replyWithMenu(
      url,
      ctx,
      /^https:\/\/www\.amazon\.co\.uk\//gi.test(url) ? "amazon" : null
    );
  }

  async notifyWithMessage(message: string, url: string) {
    this.telegramStonkService.notifyAllSubscribersWithMarkdownInlineKeyboard(
      `
${message}
${url}
    `,
      [
        [
          {
            text: "Menu",
            callback_data: this.telegramActionService.getActionId("menu", url),
          },
        ],
      ]
    );
  }

  @Command("check")
  @OnlyAdmins
  async screenshot(ctx: Context) {
    try {
      for (const script of availibilityScenarious) {
        if (script.name !== ctx.contextState?.command?.args) {
          continue;
        }

        await this.pupPage(script.url, async (page) => {
          const text = await page.content();
          const $ = cheerio.load(text);
          const type = script.name.includes("Amazon") ? "amazon" : null;

          if (!script.checkCorrectness($, text)) {
            await this.notifyWithMessage(script.name + " failed!", script.url);
            await this.replyWithMenu(script.url, ctx, type);
          } else if (script.checkMatch($, text)) {
            await this.notifyWithMessage(
              script.name + " is available!",
              script.url
            );
            await this.replyWithMenu(script.url, ctx, type);
          } else {
            await this.notifyWithMessage(
              script.name + " is out of stock!",
              script.url
            );
            await this.replyWithMenu(script.url, ctx, type);
          }
        });
      }
    } catch (error) {
      await this.telegramStonkService.notifyAllSubscribers(
        "Failed to do anything due to:\n" + error.message
      );
    }
  }

  @Command("amazonps5")
  @OnlyAdmins
  async checkAwailabilityOnAmazonPS5(ctx: Context) {
    const url =
      "https://www.amazon.co.uk/PlayStation-9395003-5-Console/dp/B08H95Y452/";
    const [isAwailable, button, page] = await this.isAmazonAwailable(url);
    if (isAwailable && button) {
      ctx.reply("Awailable!");
      await this.replyWithPhoto(page, ctx);
      await this.replyWithMenu(url, ctx, "amazon");
    } else {
      ctx.reply("No");
      await this.replyWithMenu(url, ctx);
    }
  }

  @Command("amazonps5digital")
  @OnlyAdmins
  async checkAwailabilityOnAmazonPS5Digital(ctx: Context) {
    const url =
      "https://www.amazon.co.uk/PlayStation-9395003-5-Console/dp/B08H97NYGP/?th=1";
    const [isAwailable, button, page] = await this.isAmazonAwailable(url);
    if (isAwailable && button) {
      ctx.reply("Awailable!");
      await this.replyWithPhoto(page, ctx);
      await this.replyWithMenu(url, ctx, "amazon");
    } else {
      ctx.reply("No");
      await this.replyWithMenu(url, ctx);
    }
  }

  @Command("amazonorders")
  @OnlyAdmins
  async checkAmazonOrders(ctx: Context) {
    return await this.replyWithScreenshot(
      "https://www.amazon.co.uk/gp/css/order-history?ref_=nav_orders_first",
      ctx
    );
  }

  async buyAmazon(url: string, ctx: Context) {
    const [, buyButton, page] = await this.isAmazonAwailable(url);
    if (buyButton) {
      await buyButton.click();
      await page.waitForSelector("iframe#turbo-checkout-iframe");
      let iframe = await page.$("iframe#turbo-checkout-iframe");
      const frame = await iframe.contentFrame();
      await frame.waitForNavigation({
        waitUntil: "networkidle0",
      });
      await frame.waitForSelector("#turbo-checkout-place-order-button");
      await this.replyWithPhoto(page, ctx);
      const [placeOrderButton] = await frame.$x(
        "//*[@id='turbo-checkout-place-order-button'][contains(., 'Place your order')]"
      );
      placeOrderButton.click();
      await frame.waitForNavigation({
        waitUntil: "networkidle0",
      });
      await this.replyWithPhoto(page, ctx);
    } else {
      ctx.reply("No");
      await this.replyWithPhoto(page, ctx);
    }
  }

  async getPage(browser: pup.Browser, url: string) {
    const page = await browser.newPage();
    await page.goto(url, {
      timeout: 30000,
    });

    const hasRestoredSessionCookies = await this.browserCookieSessionService.restoreCookieSession(
      page
    );

    if (!hasRestoredSessionCookies) {
      console.error("Failed to restore cookies!");
      return null;
    }

    return page;
  }

  async replyWithScreenshot(url: string, ctx: Context) {
    const hasRestoredSession = await this.browserCookieSessionService.restoreSession();

    if (!hasRestoredSession) {
      ctx.reply("Failed to restore the browser session!");
      return false;
    }

    const browser = await puppeteer.use(StealthPlugin()).launch({
      executablePath: BROWSER_PATH,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      defaultViewport: {
        width: 1024,
        height: 1024,
      },
      userDataDir: USER_FOLDER,
    });

    try {
      const page = await this.getPage(browser, url);

      if (!page) {
        ctx.reply("Failed to make an operation!");
        return false;
      }

      await page.reload();

      await this.replyWithPhoto(page, ctx);

      return true;
    } catch (e) {
      console.error(e);
      return false;
    } finally {
      await browser.close();
    }
  }

  async pupPage(
    url: string,
    callback: (page: pup.Page) => Promise<void>
  ): Promise<void> {
    const hasRestoredSession = await this.browserCookieSessionService.restoreSession();

    if (!hasRestoredSession) {
      console.error("Failed to restore the browser session!");
      throw new Error("Failed to restore the browser session!");
    }

    let browser: pup.Browser;

    try {
      browser = await puppeteer.use(StealthPlugin()).launch({
        executablePath: BROWSER_PATH,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        defaultViewport: {
          width: 1024,
          height: 1024,
        },
        userDataDir: USER_FOLDER,
      });
      const page = await this.getPage(browser, url);
      await callback(page);
    } catch (e) {
      console.error(e);
      throw e;
    } finally {
      if (browser != null) {
        await browser.close();
      }
    }
  }

  async pupToText(url: string): Promise<string> {
    const hasRestoredSession = await this.browserCookieSessionService.restoreSession();

    if (!hasRestoredSession) {
      console.error("Failed to restore the browser session!");
      return "";
    }

    let browser: pup.Browser;

    try {
      browser = await puppeteer.use(StealthPlugin()).launch({
        executablePath: BROWSER_PATH,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        defaultViewport: {
          width: 1024,
          height: 1024,
        },
        userDataDir: USER_FOLDER,
      });
      const page = await this.getPage(browser, url);
      return await page.content();
    } catch (e) {
      console.error(e);
      return "";
    } finally {
      if (browser != null) {
        await browser.close();
      }
    }
  }

  async isAmazonAwailable(
    url: string
  ): Promise<[boolean, pup.ElementHandle<Element>, pup.Page]> {
    const hasRestoredSession = await this.browserCookieSessionService.restoreSession();

    if (!hasRestoredSession) {
      console.error("Failed to restore the browser session!");
      return [false, null, null];
    }

    const browser = await puppeteer.use(StealthPlugin()).launch({
      executablePath: BROWSER_PATH,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      defaultViewport: {
        width: 1024,
        height: 1024,
      },
      userDataDir: USER_FOLDER,
    });

    try {
      const page = await this.getPage(browser, url);

      if (!page) {
        return [false, null, null];
      }

      await page.reload();

      const [awailabilityElement] = await page.$x(
        "//*[@id='availability'][contains(., 'Currently unavailable.')]"
      );
      if (awailabilityElement) {
        return [false, null, page];
      }

      const [button] = await page.$x(
        "//*[@id='buyNow'][contains(., 'Buy Now')]"
      );

      return [true, button, page];
    } catch (e) {
      console.error(e);
      return [false, null, null];
    } finally {
      await browser.close();
    }
  }

  async replyWithPhoto(page: pup.Page, ctx: Context) {
    const screenshot = await page.screenshot({
      encoding: "binary",
    });

    await ctx.replyWithPhoto({
      source: screenshot,
    });
  }

  warnTime: {
    [id: string]: number;
  } = {};
  warnInterval = 1000 * 60 * 30;

  canWarn(name: string) {
    if (this.warnTime[name] === undefined) {
      this.warnTime[name] = Number.NEGATIVE_INFINITY;
    }
    return this.warnTime[name] + this.warnInterval < +new Date();
  }

  setWarn(name: string) {
    return (this.warnTime[name] = +new Date());
  }

  unsetWarn(name: string) {
    return (this.warnTime[name] = Number.NEGATIVE_INFINITY);
  }

  @Cron("*/30 * * * * *")
  @LimitCron
  async availibilityScenariousJob() {
    for (const script of availibilityScenarious) {
      try {
        let text = "";
        if (script.usePuppeteer) {
          text = await this.pupToText(script.url);
        } else {
          text = await this.telegramFetchService.fetch({
            url: script.url,
            useProxy: script.useProxy,
          });
        }
        const $ = cheerio.load(text);

        if (!script.checkCorrectness($, text)) {
          throw new Error("Correctness failed!");
        } else if (script.checkMatch($, text)) {
          if (this.canWarn(script.name + "-avail")) {
            this.setWarn(script.name + "-avail");
            this.notifyWithMessage(script.name + " is available!", script.url);
          }
          console.log(script.name + " - YES");
        } else {
          this.unsetWarn(script.name + "-avail");
          console.log(script.name + " - NO");
        }
      } catch (error) {
        console.error(script.name, error.message);
        console.error(error);
      }
    }
  }
}
