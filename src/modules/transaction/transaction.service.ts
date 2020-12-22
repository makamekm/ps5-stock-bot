import { Injectable } from "@nestjs/common";
import { ITransaction } from "./transaction.model";
// const transactionsMock = require("./transactions.json");

@Injectable()
export class TransactionService {
  async get_list(): Promise<ITransaction[]> {
    return [];
    // return transactionsMock.data;
  }

  async add(query: {
    from_account_id: number;
    to_account_id: number;
    amount: number;
  }) {
    return -1;
  }
}
