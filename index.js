import "dotenv/config";
import cron from "node-cron";
import path from "path";
import puppeteer from "puppeteer";

cron.schedule("0 0 * * 1", async () => {
  await getHtml();
});

async function getHtml() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: {
      width: 1519,
      height: 726
    }
  });

  const page = await browser.newPage();
  await page.goto("https://sa-nhlstenden.xedule.nl", {
    waitUntil: "networkidle2"
  });

  // await page.authenticate({
  //   username: process.env.USERNAME,
  //   password: process.env.PASSWORD
  // });

  await page.type("#userNameInput", process.env.USER_NAME);
  await page.type("#passwordInput", process.env.PASSWORD);
  await page.click("#submitButton");
  await page.waitForNavigation();

  for (const text of [
    "IC_ICT_HBO ICT 1B",
    "IC_ICT VT_EXAM Y1",
    "IC_ICT_Internet of Things (INTH) - groep b"
  ]) {
    await page.type("#rosterEntitiesSelector-entity-filter", text);
  }

  await page.waitForNavigation();
  await page("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: path.resolve(__dirname)
  });
  await page.click(".k-view-ics");
  // page.on("response", console.log);

  await browser.close();
}

async function login() {
  await getHtml();
}

login();
