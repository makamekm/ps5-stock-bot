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
import {
  MenuTemplate,
  deleteMenuFromContext,
  createBackMainMenuButtons,
} from "telegraf-inline-menu";
import { DropboxCacheService } from "./dropbox-cache.service";
import { SHOW_LOCAL, SUBSCRIPTIONS_DROPBOX_PATH } from "@env/config";
import commandParts from "telegraf-command-parts";

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
    await this.notifyAllSubscribers("System has been upgraded!");
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
        command: "amazonorders",
        description: "Check Amazon Orders",
      },
      {
        command: "amazonps5",
        description: "Check Amazon PS5 Awailability",
      },
      {
        command: "amazonps5digital",
        description: "Check Amazon PS5 Digital Awailability",
      },
      {
        command: "cleandropboxsessioncache",
        description: "Clean Dropbox Session Cache",
      },
      {
        command: "cleandropboxcookiessessioncache",
        description: "Clean Dropbox Cookie Session Cache",
      },
      ...(SHOW_LOCAL
        ? [
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

  createSimpleMenu() {
    const menuTemplate = new MenuTemplate<Context>((ctx) => {
      return `Hey ${ctx.chat.first_name} ${ctx.chat.last_name} (${ctx.chat.username})!`;
    });
    // menuTemplate.choose('unique', ['walk', 'swim'], {
    //   do: async (ctx, key) => {
    //     await ctx.answerCbQuery(`Lets ${key}`)
    //     // You can also go back to the parent menu afterwards for some 'quick' interactions in submenus
    //     return '..'
    //   }
    // })
    menuTemplate.interact("Close", "a", {
      do: async (ctx) => {
        ctx.reply("As am I!");
        ctx.session = {};
        deleteMenuFromContext(ctx);
        return false;
      },
    });
    menuTemplate.toggle("Text", "unique", {
      isSet: (ctx) => ctx.session.isFunny,
      set: (ctx, newState) => {
        ctx.session.isFunny = newState;
        return true;
      },
    });
    menuTemplate.interact("Test Callback!", "b", {
      do: async (ctx) => {
        ctx.answerCbQuery("Response!");
        return true;
      },
    });

    const submenu = new MenuTemplate<Context>("I am a submenu");
    submenu.interact("Text", "uniquemenu", {
      do: async (ctx) => ctx.answerCbQuery("You hit a button in a submenu"),
    });
    submenu.manualRow(createBackMainMenuButtons("< Go Back"));
    menuTemplate.submenu("Submenu", "unique", submenu);

    menuTemplate.select(
      "uniquesdfsdf",
      ["has arms", "has legs", "has eyes", "has wings"],
      {
        columns: 1,
        showFalseEmoji: true,
        isSet: (ctx, key) =>
          Boolean(ctx.session.bodyparts && ctx.session.bodyparts[key]),
        set: (ctx, key, newState) => {
          if (!ctx.session.bodyparts) {
            ctx.session.bodyparts = {};
          }
          ctx.session.bodyparts[key] = newState;
          return true;
        },
      }
    );

    // this.menuMiddleware = new MenuMiddleware("/testmenu/", menuTemplate);
    // this.bot.command("test", (ctx) => {
    //   // ctx.session.user = chat.id;
    //   this.menuMiddleware.replyToContext(ctx, "/testmenu/");
    // });
    // this.bot.use(this.menuMiddleware);
  }

  // menuMiddleware: MenuMiddleware<Context>;

  // @Command("test")
  // test(ctx: Context) {
  //   this.menuMiddleware.replyToContext(ctx);
  // }

  @Start()
  start(ctx: Context) {
    if (!this.chatIds.includes(ctx.chat.id)) {
      this.chatIds.push(ctx.chat.id);
      this.saveSubscriptions();
    }
    ctx.reply("Welcome");
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
  async restart(ctx: Context) {
    await ctx.reply("Restarted!");
    // process.exit();
  }

  @Command("osstats")
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
/osstats - to check server stats
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

  async notifyAllSubscribers(message: string) {
    await Promise.all(
      this.chatIds.map((chatId) =>
        this.bot.telegram.sendMessage(chatId, message)
      )
    );
  }

  async notifyAllSubscribersWithMarkdownInlineKeyboard(
    message: string,
    keyboard: any[]
  ) {
    await Promise.all(
      this.chatIds.map((chatId) =>
        this.bot.telegram.sendMessage(chatId, message, {
          reply_markup: {
            inline_keyboard: keyboard,
          },
          parse_mode: "Markdown",
        })
      )
    );
  }
}
