
// import dependencies
const express = require('express'),
      app = express(),
      builder = require('xmlbuilder'),
      xml2js = require('xml2js'),
      fs = require('fs'),
      PNG = require('pngjs').PNG,
      pixelmatch = require('pixelmatch'),
      puppeteer = require('puppeteer'),
      chalk = require('chalk');
const tests = require('./tests.js');

//dev
const util = require('util');

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
let testResults = {}; // used to store the number of mismatched pixels for each test

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
    imgExpected.on('error', () => reject('parse error'));
  }).catch(error => {console.log('caught', error.message)});
  let imgApromise = new Promise((resolve, reject) => {
    imgActual.on('parsed', () => resolve('successfully parsed'));
    imgActual.on('error', () => reject('parse error'));
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

  console.log(chalk.bold("Complete") + ": test "+ (passed ? "passed" : "failed"));

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
  
  console.log(chalk.bold("Complete") + ": [" + testsPassed + "/" + testsTotal + "] tests passed");

  return {testsPassed, testsTotal};
}

function buildXML(testsPassed, testsTotal, testName=undefined) {
  if(testsTotal == 1 & fs.existsSync(__dirname + '/screenshots/report.xml') & typeof testName !== 'undefined'){ // update existing xml
    let numMismatch = testResults[testName];
    let passed = numMismatch ? false : true;

    var parser = new xml2js.Parser();

    fs.readFile(__dirname + '/screenshots/report.xml', function(err, data) {
        parser.parseString(data, function (err, result) {
            if (err) throw err;

            result['vizregResults'][testName][0]['$'] = {passed: passed, 'numMismatch': numMismatch};
            let xml2jsBuilder = new xml2js.Builder();
            let xmlString = xml2jsBuilder.buildObject(result);

            fs.writeFile('screenshots/report.xml', xmlString, (err) => {  
              if (err) throw err;
            });
        });
    });
  } else {  // write new xml
    let xml = builder.create('vizregResults')
              .att("testsPassed", testsPassed)
              .att("testsFailed", testsTotal - testsPassed)
              .att("testsTotal", testsTotal)
              .att("timeCompleted", new Date());

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
  
}


module.exports = async function(testName=undefined){
  let startAll = process.hrtime();

  // start local client to render react components
  app.use(express.static('/Users/mhudnell/dev/viz_reg/server/client/build'));
  app.get('*', function (req, res) {
    res.sendFile('/Users/mhudnell/dev/viz_reg/server/client/build/index.html');
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
    browser.close();
    server.close();

    buildXML(testsPassedArg, testsTotalArg, testName);

    let timeTakenAll = process.hrtime(startAll);
    console.log("Time taken: %d.%d seconds\n", timeTakenAll[0], Math.trunc(timeTakenAll[1]/1000000));
  })();
}




