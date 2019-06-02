import "dotenv/config";
import fs from "fs";
import cron from "node-cron";
import path from "path";
import puppeteer from "puppeteer";
import util from "util";

cron.schedule("0 0 * * 1", async () => {
  const filePath = await getICS();
  console.log(filePath);
  // await importIntoCalender();
});

/**
 * Gets .ics file
 * @returns {Promise<string>} the path of the downloaded file
 */
async function getICS() {
  const browser = await puppeteer.launch({
    headless: process.env.NODE_ENV === "production"
  });
  const page = await browser.newPage();
  await page.goto("https://sa-nhlstenden.xedule.nl");

  try {
    await manualLogin(page);
  } catch (error) {
    await page.authenticate({
      username: process.env.USER_NAME,
      password: process.env.PASSWORD
    });
  }

  await page.waitForSelector(".search-toggle");
  await page.click(".search-toggle");

  for (const text of [
    "IC_ICT_HBO ICT 1B",
    "IC_ICT VT_EXAM Y1",
    "IC_ICT_Internet of Things (INTH) - groep a"
  ]) {
    await page.type("#rosterEntitiesSelector-entity-filter", text);
    await page.keyboard.down("Enter");
    await page.waitForSelector("#rosterEntitiesSelector-entity-filter");
  }

  await page.click(".search-toggle");
  await page.click("li.k-current-view>a.k-link");

  const downloadPath = path.resolve(__dirname, "downloads");
  if (!(await util.promisify(fs.exists)(downloadPath)))
    await util.promisify(fs.mkdir)(downloadPath);

  await page._client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath
  });

  await page.click(".k-state-default.k-view-ics");

  let fileName;
  while (!fileName || fileName.endsWith(".crdownload")) {
    await new Promise(resolve => setTimeout(resolve, 100));
    [fileName] = await util.promisify(fs.readdir)(downloadPath);
  }
  await browser.close();

  const filePath = path.resolve(downloadPath, fileName);

  return filePath;
}

/**
 * fallback for loggin in
 * @param {puppeteer.Page} page
 * @returns {Promise<void>}
 */
async function manualLogin(page) {
  await page.type("#userNameInput", process.env.USER_NAME);
  await page.type("#passwordInput", process.env.PASSWORD);
  await page.click("#submitButton");
}

getICS();
