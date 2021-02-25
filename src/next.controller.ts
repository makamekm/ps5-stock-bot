import { IncomingMessage, ServerResponse } from "http";
import { Controller, Get, Post, Req, Res } from "@nestjs/common";
import { NextService } from "@nestpress/next";

@Controller()
export class NextController {
  constructor(private readonly next: NextService) {}

  @Post("ping")
  public async ping() {
    return "pong";
  }

  @Get()
  public async home(@Req() req: IncomingMessage, @Res() res: ServerResponse) {
    // this will render `pages/index.tsx`!
    await this.next.render("/index", req, res);
  }
}
