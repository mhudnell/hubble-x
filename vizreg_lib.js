
const express = require('express'),
      app = express();

const fs = require('fs'),
      PNG = require('pngjs').PNG,
      pixelmatch = require('pixelmatch'),
      puppeteer = require('puppeteer'),
      chalk = require('chalk');

const tests = require('./tests.js');

const defaultBrowserOpts = {
  x: 0,
  y: 0,
  width: 800, //800
  height: 600 //600
};

const defaultClipOpts = {
  x: 0,
  y: 0,
  width: 800,
  height: 600
}

/*
*   name: must refer to the end of the url of the page you want to test (e.g. localhost:4000/c/{name})
*/
async function diffTest(name, browser, page, clip=defaultClipOpts) {

  await page.goto('http://localhost:4000/c/' + name);

  // check if expected png exists, create it if not
  if(!fs.existsSync('screenshots/expected/' + name + '.png')) {
    await page.screenshot({ path: 'screenshots/expected/' + name + '.png',
                            clip: clip });
  }
  await page.screenshot({ path: 'screenshots/actual/' + name + '.png',
                          clip: clip });
  // await browser.close();

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

    diff.pack().pipe(fs.createWriteStream('screenshots/diff/' + name + '.png'));
    return numMismatch;
  };

  var numMismatch = await doneReading();
  var numTotal = clip.width * clip.height;

  return {numMismatch, numTotal};
}

async function preTestOne(name, browser, page){
  if(!tests[name]){ console.log('test doesnt exist'); return; }

  if(tests[name].clip){
    return await diffTest(name, browser, page, tests[name].clip);
  } else {
    return await diffTest(name, browser, page);
  }
}

async function logTestOne(name){
  const browser = await puppeteer.launch(defaultBrowserOpts);
  const page = await browser.newPage();

  console.log("Test [1/1]: " + chalk.bold.gray(name));
  process.stdout.write(" ===> ");
  var {numMismatch, numTotal} = await preTestOne(name, browser, page);
  if(numMismatch){
    process.stdout.write(chalk.bold.red("FAILED"));
    process.stdout.write(": " + numMismatch + "/" + numTotal + " (" + ((numMismatch/numTotal) * 100).toFixed(2) + "%) pixels differ\n");
  } else {
    console.log(chalk.bold.green("PASSED"));
  }
  process.stdout.write("\n");

  await browser.close();
}

async function logTestAll(){
  var testCurr = 0,
      testsPassed = 0,
      testsTotal = Object.keys(tests).length;

  const browser = await puppeteer.launch(defaultBrowserOpts);
  const page = await browser.newPage();

  for(key in tests){
    console.log("Test [" + (++testCurr) + "/" + testsTotal + "]: " + chalk.bold.gray(key));
    process.stdout.write(" ===> ");
    var {numMismatch, numTotal} = await preTestOne(key, browser, page);
    if(numMismatch){
      process.stdout.write(chalk.bold.red("FAILED"));
      process.stdout.write(": " + numMismatch + "/" + numTotal + " (" + ((numMismatch/numTotal) * 100).toFixed(2) + "%) pixels differ\n");
    } else {
      console.log(chalk.bold.green("PASSED"));
      testsPassed++;
    }
  }

  await browser.close();

  console.log("Complete: [" + testsPassed + "/" + testsTotal + "] tests passed.\n");
}

module.exports = async function(testName=undefined){
  // start local client
  app.use(express.static('/Users/mhudnell/dev/viz_reg/client/build'));
  app.get('*', function (req, res) {
    res.sendFile('/Users/mhudnell/dev/viz_reg/client/build/index.html');
  });

  // start server on port 4000
  var server = app.listen(4000);

  (async () => {

    if(typeof testName === 'undefined') {
      await logTestAll();
    } else {
      await logTestOne(testName);
    }
    
    await server.close();
  })();
}




