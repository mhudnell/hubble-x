const express = require('express'),
      app = express(),
      builder = require('xmlbuilder'),
      xml2js = require('xml2js'),
      fs = require('fs'),
      PNG = require('pngjs').PNG,
      pixelmatch = require('pixelmatch'),
      puppeteer = require('puppeteer'),
      chalk = require('chalk');
const buildAndServe = require('hubble-x-client');

// dev dependencies
// const util = require('util');

// declare constants
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
const screenshotDir = __dirname + '/../screenshots/';
const expectedDir = screenshotDir + 'expected/';
const actualDir = screenshotDir + 'actual/';
const diffDir = screenshotDir + 'diff/';

// TODO: remove these global vars
let browser;
let page;

/*
 *  Description: Returns requested tests. Returns all tests if groupName is undefined. Returns entire group if groupName
 *  is defined but testName is not. Returns specific test if groupName and testName are defined.
 *  Input:
 *    - groupName <string>
 *    - testName <string>
 *  Output: <Object>
 *    - format: 
 *    {
 *      groups: [
 *        { groupName: ,
 *          tests: [
 *            { testname: ,
 *              clip: 
 *            } ...
 *          ]
 *        } ...
 *      ]
 *    }
 */
async function getTests(groupName=undefined, testName=undefined){
  // get all test specs from hubble-x-client
  await page.goto('http://localhost:4000/testData.json');
  var testData = await page.evaluate(() =>  {
    return JSON.parse(document.querySelector("body").innerText); 
  });

  // remove groups and tests not requested
  if(groupName){
    for(let i = 0; i < testData.groups.length; ){
      let group = testData.groups[i];
      if(group.groupName != groupName){     // remove group and adjust attributes
        testData.numGroups -= 1;
        testData.numTotalTests -= group.tests.length;
        testData.groups.splice(i, 1);
      } else {
        if(testName) {
          for(let j = 0; j < group.tests.length; ){
            let test = group.tests[j];
            if(test.testName != testName){  // remove test and adjust attributes
              testData.numTotalTests -= 1;
              group.tests.splice(j, 1);
            } else {
              j++;
            }
          }
        }
        i++;
      }
    }
  }

  return testData;
}

/*
 *  Description: Takes a screenshot for the specified test. Performs a diff test if 'expected' image already exists.
 *  Sets the 'expected' image to the screenshot taken if it does not exist yet (or if update == true).
 *  Input:
 *    - groupName <string>: the name of the group the test is in.
 *    - testName <string>: the name of the test.
 *      - groupName & testName refer to the url sections in hubble-x-client (e.g. localhost:4000/{groupName}/{testName})
 *    - update <boolean>: resets the 'expected' image if true.
 *    - clip <Object>: specifies the size of screenshot to take.
 *  Output: <Object> {
 *    numMismatch <number>: the number of differing pixels between the image (0 if no diff test was performed),
 *    numTotal <number>: the total number of pixels in the screenshot taken
 *  }
 */
async function diffTest(groupName, testName, update, clip=defaultClipOpts) {
  await page.goto('http://localhost:4000/' + groupName + '/' + testName);

  let screenshot = await page.screenshot({ clip: clip });
  // check if expected png exists, create it if not
  if(update || !fs.existsSync(expectedDir + groupName + '_' + testName + '.png')) {
    fs.writeFileSync(expectedDir + groupName + '_' + testName + '.png', screenshot, (err) => {
      if(err) throw err;
    })
  }
  fs.writeFileSync(actualDir + groupName + '_' + testName + '.png', screenshot, (err) => {
    if(err) throw err;
  })

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

/*  // TODO: remove this function
 *  Description: calls diffTest() with the clip object if it is specified in the test.
 */
async function testOne(groupName, test, update){
  if(test.clip){
    return await diffTest(groupName, test.testName, update, test.clip);
  } else {
    return await diffTest(groupName, test.testName, update);
  }
}

/*
 *  Description: Logs console output and performs call to testOne() for each test.
 *  Input:
 *    - testsToRun <Object>: the object returned by getTests() which specifies the tests to run.
 *    - update <boolean>: whether to update the 'expected' images for these tests.
 *  Output: <Object> {
 *    testsPassed <number>: number of tests which passed
 *    testsTotal <number>: total number of tests
 *    testResults <Object>: the input 'testsToRun' object, but the tests inside now have a new field 'numMismatch'
 *  }
 */
async function logTests(testsToRun, update){
  let testCurr = 0,
      testsPassed = 0,
      testsTotal = testsToRun.numTotalTests;

  for(let i = 0; i < testsToRun.groups.length; i++){
    let group = testsToRun.groups[i];
    for(let j = 0; j < group.tests.length; j++){
      let test = group.tests[j];
      console.log("Test [" + (++testCurr) + "/" + testsTotal + "]: " + group.groupName + "::" + chalk.bold.gray(test.testName));
      process.stdout.write(" ===> ");
      let {numMismatch, numTotal} = await testOne(group.groupName, test, update);
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

  return {testsPassed, testsTotal, testResults: testsToRun};
}

/*  
 *  Description: Returns a reference the group and test object for the specified test (if the references exist).
 *  Input:
 *    - report <Object>: JSON object for the xml report
 *    - groupName <string>: group name to search for
 *    - testName <string>: test name to search for
 *  Output: <Object> {
 *    foundGroup <Object>: 'test' if obj is test object; 'group' if obj is group object; null if obj is null.
 *    foundTest <Object>: test, group, or null object.
 *  }
 */
function findTestInXML(report, groupName, testName){
  let groups = report['vizregResults']['Group'];
  let foundGroup = null;
  let foundTest = null;

  for(let groupIndex in groups){
    if(groups[groupIndex]['$']['name'] == groupName) {
      foundGroup = groups[groupIndex];
      
      let tests = groups[groupIndex]['Test'];
      for(let testIndex in tests) {
        if(tests[testIndex]['$']['name'] == testName) {
          foundTest = tests[testIndex];
          
          return {foundGroup, foundTest};
        }
      }
    }
  }
  return {foundGroup, foundTest};
}

/*
 *  Description: Creates an xml report and stores it in "hubble/screenshots/report.xml"
 *  Input:
 *    - testsPassed <number>: number of tests passed.
 *    - testsTotal <number>: number of total tests.
 *    - testResults <Object>: the same object that was returned from getTests, but now the 'numMismatch' field has
 *      been added to the test objects contained within.
 *      - format: 
 *      {
 *        groups: [
 *          { groupName: ,
 *            tests: [
 *              { testname: ,
 *                clip: ,
 *                numMismatch: ,
 *              } ...
 *            ]
 *          } ...
 *        ]
 *      }
 *  Output file format:
 *    <vizregResults testsPassed=? testsFailed=? testsTotal=? timeCompleted=? timeUpdated=? >
 *      <Group name=? numPassed=? numTests=?>
 *        <Test name=? passed=? numMismatch=? timeCompleted=? />
 *        ... entry for each test here
 *      </Group>
 *      ... entry for each group here
 *    </vizregResults>
 */
function createXML(testsPassed, testsTotal, testResults) {
  let timeCompleted = new Date();
  let xmlRoot = builder.create('vizregResults')
            .att("testsPassed", testsPassed)
            .att("testsFailed", testsTotal - testsPassed)
            .att("testsTotal", testsTotal)
            .att("timeCompleted", timeCompleted)
            .att("timeUpdated", "");

  for(let i = 0; i < testResults.groups.length; i++){
    let group = testResults.groups[i];
    let xmlGroup = xmlRoot.ele("Group", {'name': group.groupName});
    let numPassed = 0;
    for(let j = 0; j < group.tests.length; j++){
      let test = group.tests[j];
      let numMismatch = test.numMismatch;
      let passed = numMismatch ? false : true;
      numPassed = passed ? numPassed + 1 : numPassed;
      xmlGroup.ele("Test", {'name': test.testName, 'passed': passed, 'numMismatch': numMismatch, 'timeCompleted': timeCompleted});
    }
    xmlGroup.att('numPassed', numPassed)
            .att('numTests', group.tests.length);
  }

  let xmlString = xmlRoot.end({pretty: true});

  fs.writeFile(screenshotDir + 'report.xml', xmlString, (err) => {  
    if (err) throw err;
  });
}

/*
 *  Description: Updates the existing xml report in "hubble/screenshots/report.xml"
 *  Input:
 *    - testResults <Object>: the same object that was returned from getTests, but now the 'numMismatch' field has
 *      been added to the test objects contained within.
 *      - format: 
 *      {
 *        groups: [
 *          { groupName: ,
 *            tests: [
 *              { testname: ,
 *                clip: ,
 *                numMismatch: ,
 *              } ...
 *            ]
 *          } ...
 *        ]
 *      }
 */
function updateXML(testResults) {
  let timeCompleted = new Date();
  let parser = new xml2js.Parser();

  // read the existing report
  fs.readFile(screenshotDir + 'report.xml', function(err, data) {
    parser.parseString(data, function (err, result) {
      if (err) throw err;

      for(let i = 0; i < testResults.groups.length; i++){
        let group = testResults.groups[i];
        for(let j = 0; j < group.tests.length; j++){
          let test = group.tests[j];
          let passed = test.numMismatch ? false : true;
          let testAttributes = {
            'name': test.testName,
            'passed': passed, 
            'numMismatch': test.numMismatch,
            'timeCompleted': timeCompleted,
          };

          let {foundGroup, foundTest} = findTestInXML(result, group.groupName, test.testName);

          if(foundTest) {           // test exists => update it
            let foundTestPassed = foundTest['$'].passed;
            foundTest['$'] = testAttributes;

            if(foundTestPassed == 'true'){
              foundGroup['$'].numPassed = Number(foundGroup['$'].numPassed) + (passed ? 0 : -1);
              result['vizregResults']['$'].testsPassed = Number(result['vizregResults']['$'].testsPassed) + (passed ? 0 : -1);
              result['vizregResults']['$'].testsFailed = Number(result['vizregResults']['$'].testsFailed) + (passed ? 0 : 1);
            } else {
              foundGroup['$'].numPassed = Number(foundGroup['$'].numPassed) + (passed ? 1 : 0);
              result['vizregResults']['$'].testsPassed = Number(result['vizregResults']['$'].testsPassed) + (passed ? 1 : 0);
              result['vizregResults']['$'].testsFailed = Number(result['vizregResults']['$'].testsFailed) + (passed ? -1 : 0);
            }
          } else if(foundGroup) {   // test doesn't exist, but group does => add test to group
            result['vizregResults']['$'].testsPassed = Number(result['vizregResults']['$'].testsPassed) + (passed ? 1 : 0);
            result['vizregResults']['$'].testsFailed = Number(result['vizregResults']['$'].testsFailed) + (passed ? 0 : 1);
            result['vizregResults']['$'].testsTotal = Number(result['vizregResults']['$'].testsTotal) + 1;
            foundGroup['$'].numPassed = Number(foundGroup['$'].numPassed) + (passed ? 1 : 0);
            foundGroup['$'].numTests = Number(foundGroup['$'].numTests) + 1;
            let newTest = {
              '$': testAttributes
            }
            foundGroup['Test'].push(newTest);
          } else {                  // group does not exist => create group and add test
            result['vizregResults']['$'].testsPassed = Number(result['vizregResults']['$'].testsPassed) + (passed ? 1 : 0);
            result['vizregResults']['$'].testsFailed = Number(result['vizregResults']['$'].testsFailed) + (passed ? 0 : 1);
            result['vizregResults']['$'].testsTotal = Number(result['vizregResults']['$'].testsTotal) + 1;
            let newGroup = {
              '$': {name: group.groupName, numPassed: passed ? 1 : 0, numTests: 1},
              'Test': [],
            }
            let newTest = {
              '$': testAttributes
            }
            newGroup['Test'].push(newTest);
            result['vizregResults']['Group'].push(newGroup);
          }
        }
      }

      result['vizregResults']['$'].timeUpdated = timeCompleted;

      let xml2jsBuilder = new xml2js.Builder();
      let xmlString = xml2jsBuilder.buildObject(result);

      fs.writeFile(screenshotDir + 'report.xml', xmlString, (err) => {  
        if (err) throw err;
      });
    });
  });
}

/*
 *  Description: Creates screenshot directories if they do not exist.
 */
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

/*
 *  Description: Does 1 of the following 3:
 *                  - if groupName and testName is supplied: runs the corresponding test
 *                  - if groupName is supplied and testName is undefined: runs all tests in the corresponding group
 *                  - if groupName and testName are both undefined: runs all tests (in every group)
 *  Input: <Object> {
 *    groupName <string>: The group of tests to run
 *    testName <string>: The name of test to run, given the group
 *    update <boolean>: Whether to update the 'expected' image for the tests
 *  }
 */
module.exports = async function({ groupName=undefined, testName=undefined, update=false } = {}){
  checkDirsExist();
  let startTimeAll = process.hrtime();

  console.log("Starting renderer client . . .")
  let server = await buildAndServe();
  let buildTime = process.hrtime(startTimeAll);
  console.log("Done: Renderer client built in %d.%d seconds\n", buildTime[0], Math.trunc(buildTime[1]/1000000));

  browser = await puppeteer.launch(defaultBrowserOpts);
  page = await browser.newPage();

  let testsToRun = await getTests(groupName, testName);

  if(testsToRun.numTotalTests == 0) {
    console.log(`${chalk.yellow("ATTENTION: ")} No visual regression tests ${(groupName || testName) ? 'of that name ' : ''}were found. ` +
      `Make sure your test files are in a folder named 'hubble-tests' located in the root directory of your application.`);
    browser.close();
    server.close();
    return;
  } else {
    var {testsPassed, testsTotal, testResults} = await logTests(testsToRun, update);
  }
  browser.close();
  server.close();

  // create XML report if it doesn't exist or we are running all tests,
  // update XML report if it exists and we're running a subset of all tests
  if((groupName || testName) && fs.existsSync(screenshotDir + 'report.xml')){
    updateXML(testResults);
  } else {
    createXML(testsPassed, testsTotal, testResults);
  }

  let endTimeAll = process.hrtime(startTimeAll);
  console.log("Time taken: %d.%d seconds\n", endTimeAll[0], Math.trunc(endTimeAll[1]/1000000));
}
