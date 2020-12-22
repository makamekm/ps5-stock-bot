import { bootstrapAPI } from "./server";

console.log("Environment:", process.env.CURRENT_ENV);

bootstrapAPI();
