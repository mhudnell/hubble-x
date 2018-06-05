
const puppeteer = require('puppeteer');

const fs = require('fs'),
      PNG = require('pngjs').PNG,
      pixelmatch = require('pixelmatch');

const browser_opts = {
  x: 0,
  y: 0,
  width: 800,
  height: 600
};

(async () => {
  const browser = await puppeteer.launch(browser_opts);
  const page = await browser.newPage();

  await page.goto('http://localhost:3000/c/AccordionGroup');
  // await page.screenshot({path: 'screenshots/expected/AccordionGroup.png'});
  await page.screenshot({path: 'screenshots/actual/AccordionGroup.png'});


  var doneReading = function() {
    if (++filesRead < 2) return;
    var diff = new PNG({width: img1.width, height: img1.height});

    var numMismatch = pixelmatch(img1.data, img2.data, diff.data, img1.width, img1.height, {threshold: 0.1});
    console.log("numMismatch: " + numMismatch);
    console.log("percMismatch: " + numMismatch / (browser_opts.width * browser_opts.height));

    diff.pack().pipe(fs.createWriteStream('screenshots/diff/AccordionGroup.png'));
  };

  var filesRead = 0;
      img1 = fs.createReadStream('screenshots/expected/AccordionGroup.png').pipe(new PNG()).on('parsed', doneReading),
      img2 = fs.createReadStream('screenshots/actual/AccordionGroup.png').pipe(new PNG()).on('parsed', doneReading);
      

  await browser.close();
})();

// function doneReading() {
//   if (++filesRead < 2) return;
//   var diff = new PNG({width: img1.width, height: img1.height});

//   pixelmatch(img1.data, img2.data, diff.data, img1.width, img1.height, {threshold: 0.1});

//   diff.pack().pipe(fs.createWriteStream('screenshots/diff/create-react-app.png'));
// }

