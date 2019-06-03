// import "dotenv/config";
// import fs from "fs";
// import keytar from "keytar";
// import cron from "node-cron";
// import path from "path";
// import puppeteer from "puppeteer";
// import util from "util";
// import yargs from "yargs";

const fs = require("fs");
const keytar = require("keytar");
const cron = require("node-cron");
const path = require("path");
const puppeteer = require("puppeteer");
const util = require("util");
const yargs = require("yargs");

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
  const [{ account: username, password }] = await keytar.findCredentials(
    "xedule-scraper"
  );

  const browser = await puppeteer.launch({
    headless: process.env.NODE_ENV === "production"
  });
  const page = await browser.newPage();
  await page.goto("https://sa-nhlstenden.xedule.nl");

  try {
    await page.type("#userNameInput", username);
    await page.type("#passwordInput", password);
    await page.click("#submitButton");
  } catch (error) {
    await page.authenticate({
      username,
      password
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

yargs
  .scriptName("xedule-scraper")
  .usage("$0 <command> [args]")
  .command(
    "login [username] [password]",
    "authenticate",
    args => {
      args.positional("username", {
        type: "string",
        describe: "your nhl-stenden username"
      });
      args.positional("password", {
        type: "string",
        describe: "your nhl-stenden password"
      });
    },
    async ({ username, password }) => {
      await keytar.setPassword("xedule-scraper", username, password);
      await getICS();
    }
  )
  .help().argv;
