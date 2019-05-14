import "dotenv/config";
import cron from "node-cron";
import puppeteer from "puppeteer";

cron.schedule("0 0 * * 1", async () => {
  await getHtml();
});

async function getHtml() {
  const browser = await puppeteer.launch({
    headless: false
  });

  const page = await browser.newPage();
  await page.goto("https://sa-nhlstenden.xedule.nl", {
    waitUntil: "networkidle2"
  });

  await page.authenticate({
    username: process.env.USERNAME,
    password: process.env.PASSWORD
  });

  await page.type("rosterEntitiesSelector-entity-filter", "IC_ICT_HBO ICT 1B");
  await page.type("rosterEntitiesSelector-entity-filter", "IC_ICT VT_EXAM Y1");
  await page.type(
    "rosterEntitiesSelector-entity-filter",
    "IC_ICT_Internet of Things (INTH) - groep b"
  );

  await page.click("k-state-default k-view-ics");
  await browser.close();
}

async function login() {
  await getHtml();
}

login();
