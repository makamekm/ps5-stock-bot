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
import { USER_FOLDER } from "@env/config";
import { TelegramFetchService } from "./telegram-fetch.service";
import { LimitCron } from "./limit-cron.decorator";
import { ActionWithData } from "./telegram-action.decorator";

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
    await page.goto(url);

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

  async pupToText(url: string): Promise<string> {
    const hasRestoredSession = await this.browserCookieSessionService.restoreSession();

    if (!hasRestoredSession) {
      console.error("Failed to restore the browser session!");
      return "";
    }

    let browser: pup.Browser;

    try {
      browser = await puppeteer.use(StealthPlugin()).launch({
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

  @Cron("*/60 * * * * *")
  @LimitCron
  async handleAmazonPS5DigitalCron() {
    const url =
      "https://www.amazon.co.uk/PlayStation-9395003-5-Console/dp/B08H97NYGP/?th=1";
    try {
      // const text = await this.telegramFetchService.fetch({
      //   url,
      //   // useProxy: true,
      // });
      const text = await this.pupToText(url);
      const $ = cheerio.load(text);

      if ($("#productTitle").length === 0) {
        // if (
        //   !text.includes(
        //     "An error occurred when we tried to process your request"
        //   ) &&
        //   !text.includes("Type the characters you see in this image:")
        // ) {
        //   this.notifyWithMessage("Failed to fetch: PS5 Digital Amazon!", url);
        // }
        if (!text.includes("Type the characters you see in this image:")) {
          console.log("PS5 Digital Amazon", $("body")?.first()?.text());
        } else {
          console.log(
            "PS5 Digital Amazon requires to type the characters you see in this image"
          );
        }
      } else if ($("#add-to-cart-button").length !== 0) {
        if (this.canWarn("amazon_digital-avail")) {
          this.setWarn("amazon_digital-avail");
          const aw = $("#availability")?.first()?.text()?.trim();
          this.notifyWithMessage("PS5 Digital Amazon is awailable! " + aw, url);
        }
        console.log("PS5 Digital Amazon - YES");
      } else {
        this.unsetWarn("amazon_digital-avail");
        console.log("PS5 Digital Amazon - NO");
      }
    } catch (error) {
      // if (this.canWarn("amazon_digital")) {
      //   this.setWarn("amazon_digital");
      //   this.notifyWithMessage(
      //     "Failed to fetch: PS5 Digital Amazon! " + error.message,
      //     url
      //   );
      // }
      console.error("PS5 Digital Amazon", error.message);
      console.error(error);
    }

    // const [isAwailable, button] = await this.isAmazonAwailable(url);
    // if (isAwailable && button) {
    //   this.notifyWithMessage("PS5 Digital AMAZON is awailable!", url);
    // }
  }

  @Cron("*/60 * * * * *")
  @LimitCron
  async handleAmazonPS5Cron() {
    const url =
      "https://www.amazon.co.uk/PlayStation-9395003-5-Console/dp/B08H95Y452/";
    try {
      const text = await this.pupToText(url);
      // const text = await this.telegramFetchService.fetch({
      //   url,
      //   // useProxy: true,
      // });
      const $ = cheerio.load(text);

      if ($("#productTitle").length === 0) {
        // if (
        //   !text.includes(
        //     "An error occurred when we tried to process your request"
        //   ) &&
        //   !text.includes("Type the characters you see in this image:")
        // ) {
        //   this.notifyWithMessage("Failed to fetch: PS5 Amazon!", url);
        // }
        if (!text.includes("Type the characters you see in this image:")) {
          console.log("PS5 Amazon", $("body")?.first()?.text());
        } else {
          console.log(
            "PS5 Amazon requires to type the characters you see in this image"
          );
        }
      } else if ($("#add-to-cart-button").length !== 0) {
        if (this.canWarn("amazon-avail")) {
          this.setWarn("amazon-avail");
          const aw = $("#availability")?.first()?.text()?.trim();
          this.notifyWithMessage("PS5 Amazon is awailable! " + aw, url);
        }
        console.log("PS5 Amazon - YES");
      } else {
        this.unsetWarn("amazon-avail");
        console.log("PS5 Amazon - NO");
      }
    } catch (error) {
      // if (this.canWarn("amazon")) {
      //   this.setWarn("amazon");
      //   this.notifyWithMessage(
      //     "Failed to fetch: PS5 Amazon! " + error.message,
      //     url
      //   );
      // }
      console.error("PS5 Amazon", error.message);
      console.error(error);
    }

    // const [isAwailable, button] = await this.isAmazonAwailable(url);
    // if (isAwailable && button) {
    //   this.notifyWithMessage("PS5 AMAZON is awailable!", url);
    // }
  }

  @Cron("*/60 * * * * *")
  @LimitCron
  async handleMediaexpertPS5Cron() {
    const url =
      "https://www.mediaexpert.pl/gaming/playstation-5/konsole-ps5/konsola-sony-ps5";
    try {
      const text = await this.telegramFetchService.fetch({ url });
      const $ = cheerio.load(text);

      if ($(".is-productName").length === 0) {
        console.log("PS5 MEDIAEXPERT", $("body")?.first()?.text());
      } else if ($('[data-label="Do koszyka"]').length !== 0) {
        if (this.canWarn("mediaexpert-avail")) {
          this.setWarn("mediaexpert-avail");
          this.notifyWithMessage("PS5 MEDIAEXPERT is awailable!", url);
        }
        console.log("PS5 MEDIAEXPERT - YES");
      } else {
        this.unsetWarn("mediaexpert-avail");
        console.log("PS5 MEDIAEXPERT - NO");
      }
    } catch (error) {
      // if (this.canWarn("mediaexpert")) {
      //   this.setWarn("mediaexpert");
      //   this.notifyWithMessage(
      //     "Failed to fetch: PS5 MEDIAEXPERT! " + error.message,
      //     url
      //   );
      // }
      console.error("PS5 MEDIAEXPERT", error.message);
      console.error(error);
    }
  }

  @Cron("*/60 * * * * *")
  @LimitCron
  async handleMediaexpertPS5DigitalCron() {
    const url =
      "https://www.mediaexpert.pl/gaming/playstation-5/konsole-ps5/konsola-sony-ps5-digital";
    try {
      const text = await this.telegramFetchService.fetch({ url });
      const $ = cheerio.load(text);

      if ($(".is-productName").length === 0) {
        console.log("PS5 Digital MEDIAEXPERT", $("body")?.first()?.text());
      } else if ($('[data-label="Do koszyka"]').length !== 0) {
        if (this.canWarn("mediaexpert_digital-avail")) {
          this.setWarn("mediaexpert_digital-avail");
          this.notifyWithMessage("PS5 Digital MEDIAEXPERT is awailable!", url);
        }
        console.log("PS5 Digital MEDIAEXPERT - YES");
      } else {
        this.unsetWarn("mediaexpert_digital-avail");
        console.log("PS5 Digital MEDIAEXPERT - NO");
      }
    } catch (error) {
      // if (this.canWarn("mediaexpert_digital")) {
      //   this.setWarn("mediaexpert_digital");
      //   this.notifyWithMessage(
      //     "Failed to fetch: PS5 Digital MEDIAEXPERT! " + error.message,
      //     url
      //   );
      // }
      console.error("PS5 Digital MEDIAEXPERT", error.message);
      console.error(error);
    }
  }

  @Cron("*/60 * * * * *")
  @LimitCron
  async handleXKOMPS5DigitalCron() {
    const url =
      "https://www.x-kom.pl/p/592843-konsola-playstation-sony-playstation-5-digital.html";
    try {
      const text = await this.telegramFetchService.fetch({ url });

      if (!text.includes("Playstation")) {
        this.notifyWithMessage("Failed to fetch: PS5 Digital XKOM!", url);
      } else if (text.includes("Dodaj do koszyka")) {
        if (this.canWarn("xkom_digital-avail")) {
          this.setWarn("xkom_digital-avail");
          this.notifyWithMessage("PS5 Digital XKOM is awailable!", url);
        }
        console.log("PS5 Digital XKOM - YES");
      } else {
        this.unsetWarn("xkom_digital-avail");
        console.log("PS5 Digital XKOM - NO");
      }
    } catch (error) {
      // if (this.canWarn("xkom_digital")) {
      //   this.setWarn("xkom_digital");
      //   this.notifyWithMessage(
      //     "Failed to fetch: PS5 Digital XKOM! " + error.message,
      //     url
      //   );
      // }
      console.error("PS5 Digital XKOM", error.message);
      console.error(error);
    }
  }

  @Cron("*/60 * * * * *")
  @LimitCron
  async handleXKOMPS5Cron() {
    const url =
      "https://www.x-kom.pl/p/577878-konsola-playstation-sony-playstation-5.html";
    try {
      const text = await this.telegramFetchService.fetch({ url });

      if (!text.includes("Playstation")) {
        this.notifyWithMessage("Failed to fetch: PS5 XKOM!", url);
      } else if (text.includes("Dodaj do koszyka")) {
        if (this.canWarn("xkom-avail")) {
          this.setWarn("xkom-avail");
          this.notifyWithMessage("PS5 XKOM is awailable!", url);
        }
        console.log("PS5 XKOM - YES");
      } else {
        this.unsetWarn("xkom-avail");
        console.log("PS5 XKOM - NO");
      }
    } catch (error) {
      // if (this.canWarn("xkom")) {
      //   this.setWarn("xkom");
      //   this.notifyWithMessage(
      //     "Failed to fetch: PS5 XKOM! " + error.message,
      //     url
      //   );
      // }
      console.error("PS5 XKOM", error.message);
      console.error(error);
    }
  }

  @Cron("*/60 * * * * *")
  @LimitCron
  async handleMediamarktPS5Cron() {
    const url =
      "https://mediamarkt.pl/konsole-i-gry/konsola-sony-playstation-5";
    try {
      const text = await this.pupToText(url);
      // const text = await this.telegramFetchService.fetch({
      //   url,
      //   authority: "www.mediamarkt.pl",
      //   // useProxy: true,
      // });
      const $ = cheerio.load(text);

      if ($(".b-ofr_headDataTitle").length === 0) {
        console.log("PS5 MEDIAMARKT", $("body")?.first()?.text());
      } else if ($("#js-addToCart").length !== 0) {
        if (this.canWarn("mediamarkt-avail")) {
          this.setWarn("mediamarkt-avail");
          this.notifyWithMessage("PS5 MEDIAMARKT is awailable!", url);
        }
        console.log("PS5 MEDIAMARKT - YES");
      } else {
        this.unsetWarn("mediamarkt-avail");
        console.log("PS5 MEDIAMARKT - NO");
      }
    } catch (error) {
      // if (this.canWarn("mediamarkt")) {
      //   this.setWarn("mediamarkt");
      //   this.notifyWithMessage(
      //     "Failed to fetch: PS5 MEDIAMARKT! " + error.message,
      //     url
      //   );
      // }
      console.error("PS5 MEDIAMARKT", error.message);
      console.error(error);
    }
  }

  @Cron("*/60 * * * * *")
  @LimitCron
  async handleEUROCOMPLPS5DigitalCron() {
    const url =
      "https://m.euro.com.pl/konsole-playstation-5/sony-konsola-playstation-5-edycja-digital-ps5.bhtml";
    try {
      const text = await this.telegramFetchService.fetch({ url });
      const $ = cheerio.load(text);

      if ($(".product-header").length === 0) {
        console.log("PS5 Digital EUROCOMPL", $("body")?.first()?.text());
      } else if ($(".add-to-cart").length !== 0) {
        if (this.canWarn("eurocompl_digital-avail")) {
          this.setWarn("eurocompl_digital-avail");
          this.notifyWithMessage("PS5 Digital EUROCOMPL is awailable!", url);
        }
        console.log("PS5 Digital EUROCOMPL - YES");
      } else {
        this.unsetWarn("eurocompl_digital-avail");
        console.log("PS5 Digital EUROCOMPL - NO");
      }
    } catch (error) {
      // if (this.canWarn("eurocompl_digital")) {
      //   this.setWarn("eurocompl_digital");
      //   this.notifyWithMessage(
      //     "Failed to fetch: PS5 Digital EUROCOMPL! " + error.message,
      //     url
      //   );
      // }
      console.error("PS5 Digital EUROCOMPL", error.message);
      console.error(error);
    }
  }

  @Cron("*/60 * * * * *")
  @LimitCron
  async handleEUROCOMPLPS5Cron() {
    const url =
      "https://m.euro.com.pl/konsole-playstation-5/sony-konsola-playstation-5-ps5-blu-ray-4k.bhtml";
    try {
      const text = await this.telegramFetchService.fetch({ url });
      const $ = cheerio.load(text);

      if ($(".product-header").length === 0) {
        // this.notifyWithMessage("Failed to fetch: PS5 MEDIAEXPERT!", url);
        console.log("PS5 EUROCOMPL", $("body")?.first()?.text());
      } else if ($(".add-to-cart").length !== 0) {
        if (this.canWarn("eurocompl-avail")) {
          this.setWarn("eurocompl-avail");
          this.notifyWithMessage("PS5 EUROCOMPL is awailable!", url);
        }
        console.log("PS5 EUROCOMPL - YES");
      } else {
        this.unsetWarn("eurocompl-avail");
        console.log("PS5 EUROCOMPL - NO");
      }
    } catch (error) {
      // if (this.canWarn("eurocompl")) {
      //   this.setWarn("eurocompl");
      //   this.notifyWithMessage(
      //     "Failed to fetch: PS5 EUROCOMPL! " + error.message,
      //     url
      //   );
      // }
      console.error("PS5 EUROCOMPL", error.message);
      console.error(error);
    }
  }
}
