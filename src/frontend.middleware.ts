import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextService } from "@nestpress/next";
import { IncomingMessage, ServerResponse } from "http";

@Injectable()
export class FrontendMiddleware implements NestMiddleware {
  constructor(private readonly next: NextService) {}

  async use(req: IncomingMessage, res: ServerResponse, _next: Function) {
    await this.next.render(req.url, req, res);
  }
}
