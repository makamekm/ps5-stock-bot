import { Injectable } from "@nestjs/common";
import fetch, { Response } from "node-fetch";
import cheerio from "cheerio";
import randomUseragent from "random-useragent";
import { HttpProxyAgent } from "http-proxy-agent";

@Injectable()
export class TelegramFetchService {
  proxies: string[] = [];

  proxyCacheTime = Number.NEGATIVE_INFINITY;
  proxyCacheInterval = 1000 * 60 * 5;

  countryCodes = ["PL", "DE", "NL", "GB", "FR", "UA", "RU", "RO"];
  // countryCodes = ["PL", "DE", "NL", "GB"];

  proxyPromise: Promise<void>;

  hasProxyCacheExpired() {
    return this.proxyCacheTime + this.proxyCacheInterval < +new Date();
  }

  resetProxyCacheTime() {
    this.proxyCacheTime = +new Date();
  }

  async getProxies() {
    if (!this.hasProxyCacheExpired()) {
      return;
    }

    if (this.proxyPromise) {
      await this.proxyPromise;
      return;
    }

    let resolve: () => void;
    this.proxyPromise = new Promise((r) => (resolve = r));

    let [opts] = this.getFetchOpts("www.sslproxies.org", false);
    try {
      const res = await fetch("https://sslproxies.org/", opts);
      const text = await res.text();
      const $ = cheerio.load(text);

      if (res.status === 200) {
        const proxies: {
          ip: string;
          port?: string;
          code?: string;
          anonymity?: string;
          https?: string;
        }[] = [];

        $("td:nth-child(1)").each((index, value) => {
          proxies[index] = {
            ip: $(value).text(),
          };
        });

        $("td:nth-child(2)").each((index, value) => {
          proxies[index].port = $(value).text();
        });

        $("td:nth-child(3)").each((index, value) => {
          proxies[index].code = $(value).text();
        });

        $("td:nth-child(5)").each((index, value) => {
          proxies[index].anonymity = $(value).text();
        });

        $("td:nth-child(7)").each((index, value) => {
          proxies[index].https = $(value).text();
        });

        this.resetProxyCacheTime();

        this.proxies = proxies
          .filter((s) => this.countryCodes.includes(s.code))
          .filter((s) => s.anonymity === "anonymous")
          .filter((s) => s.https === "no")
          .map((s) => "http://" + s.ip + ":" + s.port);

        console.log("Proxies has been successfully updated!");
      } else {
        throw new Error(
          "Fail to get proxy due to status: " +
            res.status +
            ", " +
            res.statusText
        );
      }

      return;
    } catch (error) {
      console.error(error);
      console.error("Error loading proxy, please try again");
    } finally {
      if (resolve) {
        resolve();
        this.proxyPromise = null;
      }
    }
  }

  getRandomProxy() {
    return this.proxies[Math.floor(Math.random() * this.proxies.length)];
  }

  getFetchOpts(authority = "www.amazon.com", useProxy = false): [any, string] {
    const proxy = useProxy && this.getRandomProxy();

    return [
      {
        ...(proxy ? { agent: new HttpProxyAgent(proxy) } : {}),
        headers: {
          authority: authority,
          pragma: "no-cache",
          "cache-control": "no-cache",
          dnt: "1",
          "upgrade-insecure-requests": "1",
          "user-agent": randomUseragent.getRandom().userAgent,
          accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
          "sec-fetch-site": "none",
          // 'sec-fetch-site': 'same-origin',
          "sec-fetch-mode": "navigate",
          "sec-fetch-user": "?1",
          "sec-fetch-dest": "document",
          "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
          "accept-encoding": "br, gzip, deflate",
          referer: "https://www.google.com/",
          "accept-charset": "UTF-8",
        },
      },
      proxy,
    ];
  }

  async fetch(
    data: {
      url: string;
      authority?: string;
      useProxy?: boolean;
    },
    tryCount = 4
  ): Promise<[Response, string]> {
    let url = data.url;
    let authority = data.authority || "www.amazon.com";
    if (data.useProxy) {
      await this.getProxies();
    }
    const [opts, proxy] = this.getFetchOpts(authority, !!data.useProxy);
    try {
      const res = await fetch(url, opts);
      if (data.useProxy && res.status !== 200) {
        throw new Error(
          "Proxy request responded with a wrong status: " + res.status
        );
      }
      const text = await res.text();
      return [res, text];
    } catch (error) {
      if (data.useProxy) {
        if (tryCount > 0) {
          console.log(
            `Failed to fetch, retrying (${tryCount})... \n${url}`,
            error.message
          );
          return await this.fetch(data, tryCount - 1);
        } else {
          throw new Error("Fail to fetch: " + url + " using proxy: " + proxy);
        }
      } else {
        throw new Error("Fail to fetch: " + url);
      }
    }
  }
}
