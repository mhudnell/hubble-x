
// import dependencies
const express = require('express'),
      app = express(),
      builder = require('xmlbuilder'),
      fs = require('fs'),
      PNG = require('pngjs').PNG,
      pixelmatch = require('pixelmatch'),
      puppeteer = require('puppeteer'),
      chalk = require('chalk');
const tests = require('./tests.js');

// declare 'global' (to this file) variables
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
let browser;
let page;
let testResults = {}; // used to store the numMismatch for each test

/*
*   name: must refer to the end of the url of the page you want to test (e.g. localhost:4000/c/{name})
*/
async function diffTest(name, clip=defaultClipOpts) {

  await page.goto('http://localhost:4000/c/' + name);

  // check if expected png exists, create it if not
  if(!fs.existsSync('screenshots/expected/' + name + '.png')) {
    await page.screenshot({ path: 'screenshots/expected/' + name + '.png',
                            clip: clip });
  }
  await page.screenshot({ path: 'screenshots/actual/' + name + '.png',
                          clip: clip });

  // load pngs into variables
  let imgExpected = fs.createReadStream('screenshots/expected/' + name + '.png').pipe(new PNG()),
      imgActual = fs.createReadStream('screenshots/actual/' + name + '.png').pipe(new PNG());

  // create promises to tell us when pngs have loaded into imgExpected/imgActual
  let imgEpromise = new Promise((resolve, reject) => {
    imgExpected.on('parsed', () => resolve('successfully parsed'));
    imgExpected.on('error', () => reject('nogood'));
  }).catch(error => {console.log('caught', error.message)});
  let imgApromise = new Promise((resolve, reject) => {
    imgActual.on('parsed', () => resolve('successfully parsed'));
    imgActual.on('error', () => reject('nogood'));
  }).catch(error => {console.log('caught', error.message)});

  let doneReading = async function() {
    await imgEpromise;
    await imgApromise;

    let diff = new PNG({width: imgExpected.width, height: imgExpected.height});

    let numMismatch = pixelmatch(imgExpected.data, imgActual.data, diff.data, imgExpected.width, imgExpected.height, {threshold: 0.1});

    diff.pack().pipe(fs.createWriteStream('screenshots/diff/' + name + '.png'));
    return numMismatch;
  };

  let numMismatch = await doneReading();
  let numTotal = clip.width * clip.height;

  return {numMismatch, numTotal};
}

async function testOne(name){
  if(!tests[name]){ console.log('test doesnt exist'); return; }

  if(tests[name].clip){
    return await diffTest(name, tests[name].clip);
  } else {
    return await diffTest(name);
  }
}

async function logTestOne(name){
  let passed;

  console.log("Test [1/1]: " + chalk.bold.gray(name));
  process.stdout.write(" ===> ");
  let {numMismatch, numTotal} = await testOne(name);
  testResults[name] = numMismatch;
  if(numMismatch){
    passed = false;
    process.stdout.write(chalk.bold.red("FAILED"));
    process.stdout.write(": " + numMismatch + "/" + numTotal + " (" + ((numMismatch/numTotal) * 100).toFixed(2) + "%) pixels differ\n");
  } else {
    passed = true;
    console.log(chalk.bold.green("PASSED"));
  }
  process.stdout.write("\n");

  return passed;
}

async function logTestAll(){
  let testCurr = 0,
      testsPassed = 0,
      testsTotal = Object.keys(tests).length;

  for(key in tests){
    console.log("Test [" + (++testCurr) + "/" + testsTotal + "]: " + chalk.bold.gray(key));
    process.stdout.write(" ===> ");
    let {numMismatch, numTotal} = await testOne(key);
    testResults[key] = numMismatch;
    if(numMismatch){
      process.stdout.write(chalk.bold.red("FAILED"));
      process.stdout.write(": " + numMismatch + "/" + numTotal + " (" + ((numMismatch/numTotal) * 100).toFixed(2) + "%) pixels differ\n");
    } else {
      console.log(chalk.bold.green("PASSED"));
      testsPassed++;
    }
  }
  console.log("Complete: [" + testsPassed + "/" + testsTotal + "] tests passed.\n");

  return {testsPassed, testsTotal};
}

function buildXML(testsPassed, testsTotal) {
  let xml = builder.create('vizregResults')
              .att("testsPassed", testsPassed)
              .att("testsFailed", testsTotal - testsPassed)
              .att("testsTotal", testsTotal);

  for(test in testResults){
    let numMismatch = testResults[test];
    let passed = numMismatch ? false : true;
    let ele = xml.ele(test, {'passed': passed, 'numMismatch': numMismatch});
  }

  let xmlString = xml.end({pretty: true});

  fs.writeFile('screenshots/report.xml', xmlString, (err) => {  
    if (err) throw err;
  });
}


module.exports = async function(testName=undefined){
  // start local client to render react components
  app.use(express.static('/Users/mhudnell/dev/viz_reg/client/build'));
  app.get('*', function (req, res) {
    res.sendFile('/Users/mhudnell/dev/viz_reg/client/build/index.html');
  });

  // start server on port 4000
  let server = app.listen(4000);

  (async () => {
    browser = await puppeteer.launch(defaultBrowserOpts);
    page = await browser.newPage();

    let testsPassedArg; let testsTotalArg;
    if(typeof testName === 'undefined') { // run every test
      let {testsPassed, testsTotal} = await logTestAll();
      testsPassedArg = testsPassed;
      testsTotalArg = testsTotal;
    } else {                              // run specified test
      let oneTestPassed = await logTestOne(testName);
      testsPassedArg = oneTestPassed ? 1 : 0;
      testsTotalArg = 1;
    }
    buildXML(testsPassedArg, testsTotalArg);

    await browser.close();
    await server.close();
  })();
}




