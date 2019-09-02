const fs = require("fs");
const keytar = require("keytar");
const cron = require("node-cron");
const path = require("path");
const puppeteer = require("puppeteer");
const util = require("util");
const yargs = require("yargs");

cron.schedule("0 0 * * 1", async () => {
  await getICS();
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
    headless: process.env.NODE_ENV === "production",
  });

  const page = await browser.newPage();
  await page.goto("https://sa-nhlstenden.xedule.nl");

  try {
    await page.type("#userNameInput", username);
    await page.type("#passwordInput", password);
    await page.click("#submitButton");
  } catch {
    await page.authenticate({
      username,
      password,
    });
  }

  await page.waitForSelector(".search-toggle");
  await page.click(".search-toggle");

  const classesPath = path.resolve(__dirname, "classes.json");
  const json = await util.promisify(fs.readFile)(classesPath);
  const classes = JSON.parse(json);

  for (const text of classes) {
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
    downloadPath,
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
 * Sets the classes
 * @returns {Promise<string>} the path of the rosters file
 */
async function setClasses(classes) {
  const classesPath = path.resolve(__dirname, "classes.json");
  const json = JSON.stringify(classes, "", 2);

  await util.promisify(fs.writeFile)(classesPath, json, error => {
    if (error) {
      console.error(error);
      process.exit(1);
    }
  });

  return classesPath;
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
        describe: "your nhl-stenden username",
      });
      args.positional("password", {
        type: "string",
        describe: "your nhl-stenden password",
      });
    },
    async ({ username, password }) => {
      if (!username) {
        console.error("no username");
        process.exit(1);
      }
      if (!password) {
        console.log("no password");
        process.exit(1);
      }
      await keytar.setPassword("xedule-scraper", username, password);
      process.exit(0);
    }
  )
  .command(
    "fetch-roster",
    "fetches the current roster",
    () => {},
    async () => {
      await getICS();
      process.exit(0);
    }
  )
  .command(
    "set-classes [classes]",
    "sets the classes to be scraped",
    args => {
      args
        .positional("classes", {
          type: "string",
        })
        .array("classes");
    },
    async ({ classes }) => {
      if (!classes) {
        console.log("no classes");
        process.exit(0);
      }
      await setClasses(classes);
      process.exit(0);
    }
  ).argv;
