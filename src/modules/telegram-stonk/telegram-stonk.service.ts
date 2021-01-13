import { Injectable } from "@nestjs/common";
import os from "os-utils";
import session from "telegraf/session";
import {
  Start,
  Help,
  Context,
  Command,
  InjectBot,
  TelegrafProvider,
} from "nestjs-telegraf";
import { DropboxCacheService } from "./dropbox-cache.service";
import {
  SHOW_LOCAL,
  SUBSCRIPTIONS_DROPBOX_PATH,
  ADMIN_CHATIDS,
} from "@env/config";
import commandParts from "telegraf-command-parts";
import { OnlyAdmins } from "./only-admin.decorator";

@Injectable()
export class TelegramStonkService {
  chatIds: number[] = [];

  constructor(
    @InjectBot() private bot: TelegrafProvider,
    private dropboxCacheService: DropboxCacheService
  ) {
    bot.use(session());
    bot.use(commandParts());
    this.declareCommands();
    // this.createSimpleMenu();
    this.loadSubscriptions();
  }

  async loadSubscriptions() {
    try {
      this.chatIds =
        JSON.parse(
          await this.dropboxCacheService.getData(SUBSCRIPTIONS_DROPBOX_PATH)
        ) || [];
    } catch (e) {
      this.chatIds = [];
    }
    await this.notifyAllSubscribers("The system has been upgraded!");
  }

  async saveSubscriptions() {
    await this.dropboxCacheService.saveData(
      JSON.stringify(this.chatIds),
      SUBSCRIPTIONS_DROPBOX_PATH
    );
  }

  declareCommands() {
    this.bot.telegram.setMyCommands([
      {
        command: "start",
        description: "Start listening for notifications",
      },
      {
        command: "stop",
        description: "Stop listening for notifications",
      },
      {
        command: "help",
        description: "Show the help information",
      },
      ...(SHOW_LOCAL
        ? [
            // {
            //   command: "test",
            //   description: "Show menu",
            // },
            {
              command: "restart",
              description: "Restart the system",
            },
            {
              command: "osstats",
              description: "Get server stats",
            },
            {
              command: "cleansessioncache",
              description: "Clean Session Cache",
            },
            {
              command: "cleancookiessessioncache",
              description: "Clean Cookie Session Cache",
            },
            // {
            //   command: "amazonorders",
            //   description: "Check Amazon Orders",
            // },
            // {
            //   command: "amazonps5",
            //   description: "Check Amazon PS5 Awailability",
            // },
            // {
            //   command: "amazonps5digital",
            //   description: "Check Amazon PS5 Digital Awailability",
            // },
            {
              command: "localstart",
              description: "Start local browser",
            },
            {
              command: "localstop",
              description: "Stop local browser",
            },
            {
              command: "localsave",
              description: "Save local browser user data",
            },
            {
              command: "localrestore",
              description: "Restore local browser user data",
            },
            {
              command: "localsavecookie",
              description: "Save local browser cookies",
            },
            {
              command: "localrestorecookie",
              description: "Restore local browser cookies",
            },
          ]
        : []),
    ]);
  }

  @Start()
  start(ctx: Context) {
    if (!this.chatIds.includes(ctx.chat.id)) {
      this.chatIds.push(ctx.chat.id);
      this.saveSubscriptions();
    }
    ctx.reply(
      "You have subscribed to the PS5 Stock Alert Notifications. You will be informed when it will become available."
    );
  }

  @Command("stop")
  stop(ctx: Context) {
    var chatIdIndex = this.chatIds.indexOf(ctx.chat.id);
    if (chatIdIndex >= 0) {
      this.chatIds.splice(chatIdIndex, 1);
      this.saveSubscriptions();
    }
    ctx.reply("Bye!");
  }

  @Command("restart")
  @OnlyAdmins
  async restart(ctx: Context) {
    await ctx.reply("Restarted!");
    process.exit();
  }

  @Command("osstats")
  @OnlyAdmins
  async osstats(ctx: Context) {
    var chatIdIndex = this.chatIds.indexOf(ctx.chat.id);
    if (chatIdIndex >= 0) {
      this.chatIds.splice(chatIdIndex, 1);
    }
    ctx.reply(`
  CPU: ${((await new Promise<number>((r) => os.cpuUsage(r))) * 100).toFixed(2)}%
  Platform: ${os.platform()}
  CPU Count: ${os.cpuCount()}
  Memory: ${os.freemem().toFixed(2)} / ${os.totalmem().toFixed(2)} (${(
      os.freememPercentage() * 100
    ).toFixed(2)}%)
  Sustem Uptime: ${os.sysUptime().toFixed(0)}
  Process Uptime: ${os.processUptime().toFixed(0)}
  Load Average for 1 minute: ${os.loadavg(1).toFixed(2)}%
  Load Average for 5 minute: ${os.loadavg(5).toFixed(2)}%
  Load Average for 15 minute: ${os.loadavg(15).toFixed(2)}%
      `);
  }

  @Help()
  help(ctx: Context) {
    ctx.reply(`
/start - to start
/stop - to stop
    `);
    // ctx.replyWithMarkdown("/start - to start\n/stop - to stop", {
    //   reply_markup: {
    //     one_time_keyboard: true,
    //     keyboard: [
    //       [
    //         {
    //           text: "/start",

    //         },
    //         {
    //           text: "/stop",
    //         },
    //       ],
    //     ],
    //   },
    //   parse_mode: "Markdown",
    // });
  }

  // @Command("k")
  // keyboard(ctx: Context) {
  //   // console.log("Here");
  //   // ctx.reply(
  //   //   "One time keyboard",
  //   //   Markup.keyboard(["/start", "/stop", "/help"]).oneTime().resize()
  //   // );
  // }

  // @Cron("*/10 * * * * *")
  // async handleCron() {
  //   this.notifyAllSubscribers("Hello There!");
  // }

  reflect(promise: Promise<any>): Promise<any> {
    return promise.then(
      (data) => {
        return data;
      },
      (error) => {
        console.debug(error);
        return error;
      }
    );
  }

  async notifyAllSubscribers(message: string) {
    await Promise.all(
      this.chatIds.map((chatId) =>
        this.reflect(this.bot.telegram.sendMessage(chatId, message))
      )
    );
  }

  async notifyAllSubscribersWithMarkdownInlineKeyboard(
    message: string,
    keyboard: any[],
    onlyAdmins = true
  ) {
    await Promise.all(
      this.chatIds.map((chatId) =>
        this.reflect(
          !onlyAdmins ||
            ADMIN_CHATIDS.find((id) => id === Number(chatId)) != null
            ? this.bot.telegram
                .sendMessage(chatId, message, {
                  reply_markup: {
                    inline_keyboard: keyboard,
                  },
                  parse_mode: "Markdown",
                })
                .catch((error) => console.debug(error, chatId))
            : this.bot.telegram
                .sendMessage(chatId, message)
                .catch((error) => console.debug(error, chatId))
        )
      )
    );
  }
}
