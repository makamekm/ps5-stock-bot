import { Context } from "nestjs-telegraf";
import { SHOW_LOCAL } from "@env/config";

export function OnlyDev(
  target: Object,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;

  descriptor.value = function (ctx: Context, ...args) {
    if (!SHOW_LOCAL) {
      ctx.reply("This is a local command!");
    } else {
      return originalMethod.apply(this, [ctx, ...args]);
    }
  };

  return descriptor;
}
