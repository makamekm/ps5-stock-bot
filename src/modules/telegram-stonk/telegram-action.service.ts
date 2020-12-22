import { Inject, Injectable } from "@nestjs/common";
import { Context, TelegrafProvider, Action } from "nestjs-telegraf";

export const ActionWithData = (name: string) => {
  const injectBot = Inject(TelegrafProvider);
  const injectTelegramActionService = Inject(TelegramActionService);

  return function (
    target: Object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    injectBot(target, "__bot");
    injectTelegramActionService(target, "__actionTelegramActionService");

    const reg = new RegExp("^" + name + "_.+", "gi");
    const reg1 = new RegExp("^" + name + "_", "gi");

    const originalMethod = descriptor.value;

    descriptor.value = async function (ctx: Context, ...args) {
      const id = ctx.callbackQuery.data.replace(reg1, "");
      const data = this["__actionTelegramActionService"].getData(id);

      if (data === undefined) {
        return null;
      }

      return await originalMethod.apply(this, [ctx, data, ...args]);
    };

    descriptor = Action(reg)(
      target,
      propertyKey,
      descriptor
    ) as PropertyDescriptor;

    return descriptor;
  };
};

@Injectable()
export class TelegramActionService {
  actionIds: {
    [id: string]: any;
  } = {};

  getData(id: string) {
    return this.actionIds[id];
  }

  getActionId(name: string, data: any): string {
    const id = (Math.random() * 100000).toFixed(0).toString();
    this.actionIds[id] = data;
    return name + "_" + id;
  }
}
