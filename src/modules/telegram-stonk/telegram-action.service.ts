import { Injectable } from "@nestjs/common";

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
