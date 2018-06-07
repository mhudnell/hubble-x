
const fs = require('fs'),
      PNG = require('pngjs').PNG,
      pixelmatch = require('pixelmatch'),
      puppeteer = require('puppeteer');

const defaultBrowserOpts = {
  x: 0,
  y: 0,
  width: 800,
  height: 600
};

module.exports = {
  testOne: async function(name, browserOpts=defaultBrowserOpts) {
    const browser = await puppeteer.launch(browserOpts);
    const page = await browser.newPage();

    await page.goto('http://localhost:4000/c/' + name);

    // check if expected png exists, create it if not
    if(!fs.existsSync('screenshots/expected/' + name + '.png')) {
      await page.screenshot({path: 'screenshots/expected/' + name + '.png'});
    }
    await page.screenshot({path: 'screenshots/actual/' + name + '.png'});


    var doneReading = function() {
      if (++filesRead < 2) return;
      var diff = new PNG({width: imgExpected.width, height: imgExpected.height});

      var numMismatch = pixelmatch(imgExpected.data, imgActual.data, diff.data, imgExpected.width, imgExpected.height, {threshold: 0.1});
      console.log("numMismatch: " + numMismatch + " pixels out of " + (browserOpts.width * browserOpts.height));
      console.log("percMismatch: " + numMismatch * 100 / (browserOpts.width * browserOpts.height) + " %");

      diff.pack().pipe(fs.createWriteStream('screenshots/diff/' + name + '.png'));
    };

    var filesRead = 0;
        imgExpected = fs.createReadStream('screenshots/expected/' + name + '.png').pipe(new PNG()).on('parsed', doneReading),
        imgActual = fs.createReadStream('screenshots/actual/' + name + '.png').pipe(new PNG()).on('parsed', doneReading);

    await browser.close();
  }
}
