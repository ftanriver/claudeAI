// kartlar.js'deki her kartı cikti/<dosya>.png olarak dışa aktarır (2x, 1520 px genişlik).
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { pathToFileURL } = require("url");
const { chromium } = require("playwright");

const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "kartlar.js"), "utf8"), sandbox);
const kartlar = sandbox.window.KARTLAR;

(async () => {
  const outDir = path.join(__dirname, "cikti");
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 800, height: 800 }, deviceScaleFactor: 2 });
  const sablon = pathToFileURL(path.join(__dirname, "kart.html"));

  for (const kart of kartlar) {
    sablon.search = "?kart=" + encodeURIComponent(kart.dosya);
    await page.goto(sablon.href);
    await page.evaluate(() => document.fonts.ready);
    const out = path.join(outDir, kart.dosya + ".png");
    await page.locator(".card").screenshot({ path: out });
    console.log(out);
  }

  await browser.close();
})();
