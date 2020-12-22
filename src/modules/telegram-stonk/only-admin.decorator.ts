import { Context } from "nestjs-telegraf";
import { ADMIN_USERNAMES } from "@env/config";

export function isAdmin(username: string) {
  return ADMIN_USERNAMES.includes(username);
}

export function OnlyAdmins(
  target: Object,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;

  descriptor.value = function (ctx: Context, ...args) {
    if (!ADMIN_USERNAMES.includes(ctx.chat.username)) {
      ctx.reply("You are not an admin!");
    } else {
      return originalMethod.apply(this, [ctx, ...args]);
    }
  };

  return descriptor;
}
