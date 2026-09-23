// kartlar.js'deki her kart için aşağıdaki görselleri cikti/ klasörüne üretir
// (olcek: piksel yoğunluğu, varsayılan 2x).
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { pathToFileURL } = require("url");
const { chromium } = require("playwright");

const GORSELLER = [
  { sablon: "kart.html", cikti: "{dosya}-butonlu.png" },
  { sablon: "kart.html", sorgu: "&buton=0", cikti: "{dosya}-butonsuz.png" },
  { sablon: "kart-dikey.html", cikti: "alternatifler/{dosya}-dikey.png" },
  { sablon: "kart-kare.html", cikti: "alternatifler/{dosya}-kare.png" },
  { sablon: "kart-yatay.html", cikti: "alternatifler/{dosya}-yatay.png" },
  // 341 × 277 modül görsel alanı, 3x: 1023 × 831 px
  { sablon: "kart-modul.html", olcek: 3, cikti: "modul-341x277/{dosya}-klasik.png" },
  { sablon: "kart-modul-vurgulu.html", olcek: 3, cikti: "modul-341x277/{dosya}-vurgulu.png" },
];

const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "kartlar.js"), "utf8"), sandbox);
const kartlar = sandbox.window.KARTLAR;

(async () => {
  const browser = await chromium.launch();
  const sayfalar = new Map();
  const sayfa = async olcek => {
    if (!sayfalar.has(olcek)) {
      sayfalar.set(olcek, await browser.newPage({ viewport: { width: 1000, height: 1000 }, deviceScaleFactor: olcek }));
    }
    return sayfalar.get(olcek);
  };

  for (const kart of kartlar) {
    for (const g of GORSELLER) {
      const page = await sayfa(g.olcek || 2);
      const url = pathToFileURL(path.join(__dirname, g.sablon));
      url.search = "?kart=" + encodeURIComponent(kart.dosya) + (g.sorgu || "");
      await page.goto(url.href);
      await page.evaluate(() => document.fonts.ready);
      const out = path.join(__dirname, "cikti", g.cikti.replace("{dosya}", kart.dosya));
      fs.mkdirSync(path.dirname(out), { recursive: true });
      await page.locator(".card").screenshot({ path: out });
      console.log(out);
    }
  }

  await browser.close();
})();
