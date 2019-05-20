import "dotenv/config";
import cron from "node-cron";
import path from "path";
import puppeteer from "puppeteer";

cron.schedule("0 0 * * 1", async () => {
  await getHtml();
});

async function getHtml() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("https://sa-nhlstenden.xedule.nl");

  await page.type("#userNameInput", process.env.USERNAME);
  await page.type("#passwordInput", process.env.PASSWORD);
  await page.click("#submitButton");
  await page.waitForSelector(".search-toggle");

  await page.click(".search-toggle");

  for (const text of [
    "IC_ICT_HBO ICT 1B",
    "IC_ICT VT_EXAM Y1",
    "IC_ICT_Internet of Things (INTH) - groep b"
  ]) {
    await page.type("#rosterEntitiesSelector-entity-filter", text);
    await page.keyboard.down("Enter");
    await page.waitForSelector("#rosterEntitiesSelector-entity-filter");
  }

  await page.click(".search-toggle");
  await page.click("li.k-current-view>a.k-link");

  const downloadPath = path.resolve(
    process.cwd(),
    `download-${Math.random()
      .toString(36)
      .substr(2, 8)}`
  );

  await page._client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: downloadPath
  });

  await page.click(".k-view-ics");
  await browser.close();
}

getHtml();
