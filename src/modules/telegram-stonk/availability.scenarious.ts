export const availibilityScenarious: {
  name: string;
  url: string;
  usePuppeteer?: boolean;
  useProxy?: boolean;
  checkCorrectness: ($: cheerio.Root, text: string) => boolean;
  checkMatch: ($: cheerio.Root, text: string) => boolean;
}[] = [
  {
    name: "PS5 Digital Amazon",
    url:
      "https://www.amazon.co.uk/PlayStation-9395003-5-Console/dp/B08H97NYGP/?th=1",
    checkCorrectness: ($) => $("#productTitle").length !== 0,
    checkMatch: ($) => $("#add-to-cart-button").length !== 0,
    usePuppeteer: true,
  },
  {
    name: "PS5 Amazon",
    url:
      "https://www.amazon.co.uk/PlayStation-9395003-5-Console/dp/B08H95Y452/",
    checkCorrectness: ($) => $("#productTitle").length !== 0,
    checkMatch: ($) => $("#add-to-cart-button").length !== 0,
    usePuppeteer: true,
  },
  {
    name: "PS5 MEDIAEXPERT",
    url:
      "https://www.mediaexpert.pl/gaming/playstation-5/konsole-ps5/konsola-sony-ps5",
    checkCorrectness: ($) => $(".is-productName").length !== 0,
    checkMatch: ($) => $('[data-label="Do koszyka"]').length !== 0,
  },
  {
    name: "PS5 Digital MEDIAEXPERT",
    url:
      "https://www.mediaexpert.pl/gaming/playstation-5/konsole-ps5/konsola-sony-ps5-digital",
    checkCorrectness: ($) => $(".is-productName").length !== 0,
    checkMatch: ($) => $('[data-label="Do koszyka"]').length !== 0,
  },
  {
    name: "PS5 Digital XKOM",
    url:
      "https://www.x-kom.pl/p/592843-konsola-playstation-sony-playstation-5-digital.html",
    checkCorrectness: ($, text) => text.includes("Playstation"),
    checkMatch: ($, text) => text.includes("Dodaj do koszyka"),
  },
  {
    name: "PS5 XKOM",
    url:
      "https://www.x-kom.pl/p/577878-konsola-playstation-sony-playstation-5.html",
    checkCorrectness: ($, text) => text.includes("Playstation"),
    checkMatch: ($, text) => text.includes("Dodaj do koszyka"),
  },
  {
    name: "PS5 MEDIAMARKT",
    url: "https://mediamarkt.pl/konsole-i-gry/konsola-sony-playstation-5",
    checkCorrectness: ($) => $(".b-ofr_headDataTitle").length !== 0,
    checkMatch: ($) => $("#js-addToCart").length !== 0,
    usePuppeteer: true,
  },
  {
    name: "PS5 Digital EUROCOMPL",
    url:
      "https://m.euro.com.pl/konsole-playstation-5/sony-konsola-playstation-5-edycja-digital-ps5.bhtml",
    checkCorrectness: ($) => $(".product-header").length !== 0,
    checkMatch: ($) => $(".add-to-cart").length !== 0,
  },
  {
    name: "PS5 EUROCOMPL",
    url:
      "https://m.euro.com.pl/konsole-playstation-5/sony-konsola-playstation-5-ps5-blu-ray-4k.bhtml",
    checkCorrectness: ($) => $(".product-header").length !== 0,
    checkMatch: ($) => $(".add-to-cart").length !== 0,
  },
];
