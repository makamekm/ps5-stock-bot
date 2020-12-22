import { Controller, Get, Post, Body } from "@nestjs/common";
import { InjectBot, TelegrafProvider } from "nestjs-telegraf";
import { TransactionService } from "./transaction.service";

@Controller("api/v1/transaction")
export class TransactionController {
  constructor(
    private readonly transactionService: TransactionService,
    @InjectBot() private bot: TelegrafProvider
  ) {}

  @Get("ping")
  ping(): string {
    return "pong";
  }

  @Get("ping-telegram")
  pingTelegram(): string {
    return "pong";
  }

  @Post("add")
  async add(@Body() data: Parameters<TransactionService["add"]>[0]) {
    return this.transactionService.add(data);
  }

  @Get("list")
  async list() {
    return this.transactionService.get_list();
  }
}
