
const fs = require('fs'),
      PNG = require('pngjs').PNG,
      pixelmatch = require('pixelmatch'),
      puppeteer = require('puppeteer');
      // sharedComponents = require('../client/src/testComponentsNames.js');

const defaultBrowserOpts = {
  x: 0,
  y: 0,
  width: 800,
  height: 600
};

module.exports = {
  testOne: async function(name, browserOpts=defaultBrowserOpts) {
    console.log("Testing " + name + " . . ...");
    const browser = await puppeteer.launch(browserOpts);
    const page = await browser.newPage();

    await page.goto('http://localhost:4000/c/' + name);

    // check if expected png exists, create it if not
    if(!fs.existsSync('screenshots/expected/' + name + '.png')) {
      await page.screenshot({path: 'screenshots/expected/' + name + '.png'});
    }
    await page.screenshot({path: 'screenshots/actual/' + name + '.png'});
    await browser.close();

    // load pngs into variables
    var imgExpected = fs.createReadStream('screenshots/expected/' + name + '.png').pipe(new PNG()),
        imgActual = fs.createReadStream('screenshots/actual/' + name + '.png').pipe(new PNG());

    // create promises to tell us when pngs have loaded into imgExpected/imgActual
    var imgEpromise = new Promise((resolve, reject) => {
      imgExpected.on('parsed', () => resolve('successfully parsed'));
      imgExpected.on('error', () => reject('nogood'));
    }).catch(error => {console.log('caught', error.message)});
    var imgApromise = new Promise((resolve, reject) => {
      imgActual.on('parsed', () => resolve('successfully parsed'));
      imgActual.on('error', () => reject('nogood'));
    }).catch(error => {console.log('caught', error.message)});

    var doneReading = async function() {
      await imgEpromise;
      await imgApromise;

      var diff = new PNG({width: imgExpected.width, height: imgExpected.height});

      var numMismatch = pixelmatch(imgExpected.data, imgActual.data, diff.data, imgExpected.width, imgExpected.height, {threshold: 0.1});
      numMismatch ? console.log("TEST \x1b[31m%s\x1b[0m", "FAILED") : console.log("TEST \x1b[32m%s\x1b[0m", "PASSED");
      console.log("numMismatch: " + numMismatch + " pixels out of " + (browserOpts.width * browserOpts.height));
      console.log("percMismatch: " + numMismatch * 100 / (browserOpts.width * browserOpts.height) + " %\n");

      diff.pack().pipe(fs.createWriteStream('screenshots/diff/' + name + '.png'));
      return numMismatch;
    };

    var numMismatch = await doneReading();

    return numMismatch;
  },

  testAll: async function() {
    await module.exports.testOne('Accordion');
    await module.exports.testOne('AccordionGroup');
  }
}
