
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
};
const screenshotDir = __dirname + '/screenshots/';
const expectedDir = screenshotDir + 'expected/';
const actualDir = screenshotDir + 'actual/';
const diffDir = screenshotDir + 'diff/';
let testData;
let browser;
let page;
let testResults = {}; // used to store the number of mismatched pixels for each test

async function getTestData() {
  await page.goto('http://localhost:4000/testData.json');

  testData = await page.evaluate(() =>  {
    return JSON.parse(document.querySelector("body").innerText); 
  });

  return
}

/*
*   name: must refer to the end of the url of the page you want to test (e.g. localhost:4000/c/{name})
*/
async function diffTest(groupName, testName, clip=defaultClipOpts) {
  checkDirsExist();
  await page.goto('http://localhost:4000/' + groupName + '/' + testName);

  // check if expected png exists, create it if not
  if(!fs.existsSync(expectedDir + groupName + '_' + testName + '.png')) {
    await page.screenshot({ path: expectedDir + groupName + '_' + testName + '.png',
                            clip: clip });
  }
  await page.screenshot({ path: actualDir + groupName + '_' + testName + '.png',
                          clip: clip });

  // load pngs into variables
  let imgExpected = fs.createReadStream(expectedDir + groupName + '_' + testName + '.png').pipe(new PNG()),
      imgActual = fs.createReadStream(actualDir + groupName + '_' + testName + '.png').pipe(new PNG());

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

    diff.pack().pipe(fs.createWriteStream(diffDir + groupName + '_' + testName + '.png'));
    return numMismatch;
  };

  let numMismatch = await doneReading();
  let numTotal = clip.width * clip.height;

  return {numMismatch, numTotal};
}

async function testOne(groupName, test){
  if(test.clip){
    return await diffTest(groupName, test.testName, test.clip);
  } else {
    return await diffTest(groupName, test.testName);
  }
}

// async function logTestOne(name){
//   let passed;

//   console.log("Test [1/1]: " + chalk.bold.gray(name));
//   process.stdout.write(" ===> ");
//   let {numMismatch, numTotal} = await testOne(name);
//   testResults[name] = numMismatch;
//   if(numMismatch){
//     passed = false;
//     process.stdout.write(chalk.bold.red("FAILED"));
//     process.stdout.write(": " + numMismatch + "/" + numTotal + " (" + ((numMismatch/numTotal) * 100).toFixed(2) + "%) pixels differ\n");
//   } else {
//     passed = true;
//     console.log(chalk.bold.green("PASSED"));
//   }

//   console.log(chalk.bold("Complete") + ": test "+ (passed ? "passed" : "failed"));

//   return passed;
// }

async function logTestAll(){
  let testCurr = 0,
      testsPassed = 0,
      testsTotal = testData.numTotalTests;

  for(let i = 0; i < testData.groups.length; i++){
    let group = testData.groups[i];
    for(let j = 0; j < group.tests.length; j++){
      let test = group.tests[j];
      console.log("Test [" + (++testCurr) + "/" + testsTotal + "]: " + group.groupName + "::" + chalk.bold.gray(test.testName));
      process.stdout.write(" ===> ");
      let {numMismatch, numTotal} = await testOne(group.groupName, test);
      test.numMismatch = numMismatch;
      if(numMismatch){
        process.stdout.write(chalk.bold.red("FAILED"));
        process.stdout.write(": " + numMismatch + "/" + numTotal + " (" + ((numMismatch/numTotal) * 100).toFixed(2) + "%) pixels differ\n");
      } else {
        console.log(chalk.bold.green("PASSED"));
        testsPassed++;
      }
    }
  }
  
  console.log(chalk.bold("Complete") + ": [" + testsPassed + "/" + testsTotal + "] tests passed");

  return {testsPassed, testsTotal};
}

function buildXML(testsPassed, testsTotal, testName=undefined) {
  if(testsTotal == 1 & fs.existsSync(screenshotDir + 'report.xml') & typeof testName !== 'undefined'){ // update existing xml for one test
    let numMismatch = testResults[testName];
    let passed = numMismatch ? false : true;

    var parser = new xml2js.Parser();

    fs.readFile(screenshotDir + 'report.xml', function(err, data) {
        parser.parseString(data, function (err, result) {
            if (err) throw err;

            result['vizregResults'][testName][0]['$'] = {passed: passed, 'numMismatch': numMismatch};
            let xml2jsBuilder = new xml2js.Builder();
            let xmlString = xml2jsBuilder.buildObject(result);

            fs.writeFile(screenshotDir + 'report.xml', xmlString, (err) => {  
              if (err) throw err;
            });
        });
    });
  } else {  // write new xml for all tests
    let xmlRoot = builder.create('vizregResults')
              .att("testsPassed", testsPassed)
              .att("testsFailed", testsTotal - testsPassed)
              .att("testsTotal", testsTotal)
              .att("timeCompleted", new Date());

    for(let i = 0; i < testData.groups.length; i++){
      let group = testData.groups[i];
      let xmlGroup = xmlRoot.ele(group.groupName);
      let numPassed = 0;
      for(let j = 0; j < group.tests.length; j++){
        let test = group.tests[j];
        let numMismatch = test.numMismatch;
        let passed = numMismatch ? false : true;
        numPassed = passed ? numPassed + 1 : numPassed;
        xmlGroup.ele(test.testName, {'passed': passed, 'numMismatch': numMismatch});
      }
      xmlGroup.att('numPassed', numPassed)
              .att('numTests', group.tests.length);
    }

    let xmlString = xmlRoot.end({pretty: true});

    fs.writeFile(screenshotDir + 'report.xml', xmlString, (err) => {  
      if (err) throw err;
    });
  }
}

function checkDirsExist() {
  if(!fs.existsSync(screenshotDir)){
    fs.mkdirSync(screenshotDir);
  }
  if(!fs.existsSync(expectedDir)){
    fs.mkdirSync(expectedDir);
  }
  if(!fs.existsSync(actualDir)){
    fs.mkdirSync(actualDir);
  }
  if(!fs.existsSync(diffDir)){
    fs.mkdirSync(diffDir);
  }
}

module.exports = async function(testName=undefined){
  let startAll = process.hrtime();

  // start local client to render react components
  app.use(express.static('/Users/mhudnell/dev/viz_reg/client/build')); //'/Users/mhudnell/dev/viz_reg/server/node_modules/viz_client/build'
  app.get('*', function (req, res) {
    res.sendFile('/Users/mhudnell/dev/viz_reg/client/build/index.html'); //'/Users/mhudnell/dev/viz_reg/server/node_modules/viz_client/build/index.html'
  });

  // start server on port 4000
  let server = app.listen(4000);

  (async () => {
    browser = await puppeteer.launch(defaultBrowserOpts);
    page = await browser.newPage();

    await getTestData();

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




