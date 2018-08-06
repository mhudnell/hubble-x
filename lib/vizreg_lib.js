
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

const buildAndServe = require('hubble-x-client');
//dev
const util = require('util');

// declare 'global' variables
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

// TODO: don't use these global vars
// let testData;
let browser;
let page;

/*
 *  Description: 
 *  Input:
 *    - groupName <string>: the name of the group the test is in.
 *    - testName <string>: the name of the test.
 *      - groupName & testName refer to the url sections in hubble-x-client (e.g. localhost:4000/{groupName}/{testName})
 *    - update <boolean>: resets the 'expected' image if true.
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

async function testOne(groupName, test, update){
  if(test.clip){
    return await diffTest(groupName, test.testName, update, test.clip);
  } else {
    return await diffTest(groupName, test.testName, update);
  }
}

/*  DEPRECATED
 *  Description: Parses the testData JSON to create an array of tests. Does 1 of the following 4:
 *                - if (groupName & testName): return 1 test, if it exists
 *                - if (groupName & !testName): return all tests (in the specified group)
 *                - if (!groupName & testName): return all tests with that name (in any group)
 *                - if (!groupName & !testName): return all tests (in every group)
 *  Input:
 *    - groupName <string>: the group of tests to retrieve
 *    - testName <string>: the test to retrieve
 *  Output: <Object> Array of tests
 *    - element fields: {
 *        groupName <string>,
 *        testName <string>,
 *        clip <Object>,
 *      }
 */
// function getTests(groupName, testName){
//   let testsToReturn = [];
//   // console.log("groupName: ", groupName);
//   // console.log("testName: ", testName);

//   for(let i = 0; i < testData.groups.length; i++){
//     let group = testData.groups[i];
//     if(!groupName | group.groupName == groupName){
//       for(let j = 0; j < group.tests.length; j++){
//         let test = group.tests[j];
//         if(testName){
//           if(test.testName == testName){
//             test.groupName = group.groupName;
//             testsToReturn.push(test);
//             return testsToReturn;
//           }
//         } else {
//           test.groupName = group.groupName;
//           testsToReturn.push(test);
//         }
//       }
//     }
//   }
//   return testsToReturn;
// }

/*
 *  Description: Returns requested tests.
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
      // console.log(i, testData.groups.length, group.groupName);
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

// DEPRECATED
// async function logTests(groupName, testName, update){
  
//   let testsToRun = getTests(groupName, testName);
//   let testsPassed = 0;
//   let testsTotal = testsToRun.length;
//   // console.log(testsToRun);

//   if(testsToRun.length == 0){
//     console.log("Test not found");
//     return null;
//   }

//   for(let i = 0; i < testsToRun.length; i++){
//     let passed;
//     console.log("Test ["+(i+1)+"/"+testsToRun.length+"]: " + groupName + "::" + chalk.bold.gray(testsToRun[i].testName));
//     process.stdout.write(" ===> ");

//     let {numMismatch, numTotal} = await testOne(groupName, testsToRun[i], update);
//     testsToRun[i].numMismatch = numMismatch;
//     // testResults[name] = numMismatch;
//     if(numMismatch){
//       process.stdout.write(chalk.bold.red("FAILED"));
//       process.stdout.write(": " + numMismatch + "/" + numTotal + " (" + ((numMismatch/numTotal) * 100).toFixed(2) + "%) pixels differ\n");
//     } else {
//       testsPassed += 1;
//       console.log(chalk.bold.green("PASSED"));
//     }
//   }
  
//   console.log(chalk.bold("Complete") + ": [" + testsPassed + "/" + testsTotal + "] tests passed");

//   return {testsPassed, testsTotal, testsToRun};

// }

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

/*  TODO: Update documentation
 *  Description: Returns a reference to the test object the test is found in the report. Returns a reference
 *  to the group object if the group is found but the test is not. Otherwise, returns null.
 *  Output: <Object>: {
 *    testOrGroup <string>: 'test' if obj is test object; 'group' if obj is group object; null if obj is null.
 *    obj <Object>: test, group, or null object.
 *  }
 */
function findTestInXML(report, groupName, testName){
  let groups = report['vizregResults']['Group'];
  // let obj = null;
  // let testOrGroup = null;
  let foundGroup = null;
  let foundTest = null;
  for(let groupIndex in groups){
    if(groups[groupIndex]['$']['name'] == groupName) {
      // obj = groups[groupIndex];
      // testOrGroup = 'group';
      foundGroup = groups[groupIndex];
      
      let tests = groups[groupIndex]['Test'];
      for(let testIndex in tests) {
        if(tests[testIndex]['$']['name'] == testName) {
          // obj = tests[testIndex];
          // testOrGroup = 'test';
          foundTest = tests[testIndex];
          
          // return {testOrGroup, obj};
          return {foundGroup, foundTest};
        }
      }
    }
  }
  // return {testOrGroup, obj};
  return {foundGroup, foundTest};
}

/*  DEPRECATED
 *  Description: Builds an xml file with all test results in it and stores it in '../screenshots/report.xml'. Performs an update 
 *    instead of overwrite if testName is supplied and report.xml already exists.
 *  Input:
 *    - testsPassed <number>: number of tests which passed
 *    - testsTotal <number>: total number of tests
 *    - testsToUpdate <Object>: an array of tests to update
 *    - groupName <string> (optional): the group to update the XML entry for
 *    - testName <string> (optional): the test to update the XML entry for
 *  Output file format:
 *    <vizregResults testsPassed=? testsFailed=? testsTotal=? timeCompleted=?>
 *      <Group name=? numPassed=? numTests=?>
 *        <Test name=? passed=? numMismatch=?/>
 *        ... entry for each test here
 *      </Group>
 *      ... entry for each group here
 *    </vizregResults>
 */
// function buildXML(testsPassed, testsTotal, testResults) { //  groupName=undefined, testName=undefined
//   let timeCompleted = new Date();
//   // console.log(testResults);

//   // check to see if we need to rewrite the entire report, or just update a portion of it
//   if(testsToUpdate & fs.existsSync(screenshotDir + 'report.xml')){ // update the xml report
//     console.log("update");
//     var parser = new xml2js.Parser();

//     // read the existing report
//     fs.readFile(screenshotDir + 'report.xml', function(err, data) {
//         parser.parseString(data, function (err, result) {
//             if (err) throw err;
//             // console.log(util.inspect(result, { showHidden: true, depth: null }));
//             // console.log("=======");

//             for(let i = 0; i < testsToUpdate.length; i++){
//               let passed = testsToUpdate[i].numMismatch ? false : true;
//               let testAttributes = {
//                 'name': testsToUpdate[i].testName,
//                 'passed': passed, 
//                 'numMismatch': testsToUpdate[i].numMismatch,
//                 'timeCompleted': timeCompleted,
//               };

//               let {testOrGroup, obj} = findTestInXML(result, testsToUpdate[i].groupName, testsToUpdate[i].testName);

//               if(testOrGroup == 'test') {           // test exists => update it
//                 obj['$'] = testAttributes;
//               } else if(testOrGroup == 'group') {   // test doesn't exist, but group does => add test to group
//                 obj['$'].numPassed = obj['$'].numPassed + (passed ? 1 : 0);
//                 obj['$'].numTests = obj['$'].numTests + 1;
//                 let testObj = {
//                   '$': testAttributes
//                 }
//                 obj['Test'].push(testObj);
//               } else {                              // group does not exist => create group and add test
//                 let groupObj = {
//                   '$': {name: testsToUpdate[i].groupName, numPassed: passed ? 1 : 0, numTests: 1},
//                   'Test': [],
//                 }
//                 let testObj = {
//                   '$': testAttributes
//                 }
//                 groupObj['Test'].push(testObj);
//                 result['vizregResults']['Group'].push(groupObj);
//               }
//             }

//             let xml2jsBuilder = new xml2js.Builder();
//             let xmlString = xml2jsBuilder.buildObject(result);

//             fs.writeFile(screenshotDir + 'report.xml', xmlString, (err) => {  
//               if (err) throw err;
//             });
//         });
//     });
//   } else {  // write new xml for all tests
//     console.log("createXML");
//     let xmlRoot = builder.create('vizregResults')
//               .att("testsPassed", testsPassed)
//               .att("testsFailed", testsTotal - testsPassed)
//               .att("testsTotal", testsTotal)
//               .att("timeCompleted", timeCompleted);

//     for(let i = 0; i < testData.groups.length; i++){
//       let group = testData.groups[i];
//       let xmlGroup = xmlRoot.ele("Group", {'name': group.groupName});
//       let numPassed = 0;
//       for(let j = 0; j < group.tests.length; j++){
//         let test = group.tests[j];
//         let numMismatch = test.numMismatch;
//         let passed = numMismatch ? false : true;
//         numPassed = passed ? numPassed + 1 : numPassed;
//         xmlGroup.ele("Test", {'name': test.testName, 'passed': passed, 'numMismatch': numMismatch});
//       }
//       xmlGroup.att('numPassed', numPassed)
//               .att('numTests', group.tests.length);
//     }

//     let xmlString = xmlRoot.end({pretty: true});

//     fs.writeFile(screenshotDir + 'report.xml', xmlString, (err) => {  
//       if (err) throw err;
//     });
//   }
// }

/*
 *  Description:
 */
function createXML(testsPassed, testsTotal, testResults) {
  console.log("createXML");
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
 *  Description:
 */
function updateXML(testsPassed, testsTotal, testResults) {
  console.log("updateXML");
  let timeCompleted = new Date();
  let parser = new xml2js.Parser();

  // read the existing report
  fs.readFile(screenshotDir + 'report.xml', function(err, data) {
    parser.parseString(data, function (err, result) {
      if (err) throw err;
      // console.log(util.inspect(result, { showHidden: true, depth: null }));
      // console.log("=======");

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

          // let {testOrGroup, obj} = findTestInXML(result, group.groupName, test.testName);
          let {foundGroup, foundTest} = findTestInXML(result, group.groupName, test.testName);

          if(foundTest) {           // test exists => update it
            // obj['$'] = testAttributes;
            foundTest['$'] = testAttributes;
            // TODO: update groups 'numPassed' field correctly
            foundGroup['$'].numPassed = foundGroup['$'].numPassed + (passed ? 1 : 0);
          } else if(foundGroup) {   // test doesn't exist, but group does => add test to group
            // obj['$'].numPassed = obj['$'].numPassed + (passed ? 1 : 0);
            // obj['$'].numTests = obj['$'].numTests + 1;
            foundGroup['$'].numPassed = foundGroup['$'].numPassed + (passed ? 1 : 0);
            foundGroup['$'].numTests = foundGroup['$'].numTests + 1;
            let newTest = {
              '$': testAttributes
            }
            // obj['Test'].push(newTest);
            foundGroup['Test'].push(newTest);
          } else {                              // group does not exist => create group and add test
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
 *  Input: Object {
 *           groupName <string>: The group of tests to run
 *           testName <string>: The name of test to run, given the group
 *           update <boolean>: Whether to update the 'expected' image for the tests
 *         }
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
  // console.log(util.inspect(testsToRun, { showHidden: true, depth: null }));
  // console.log("=======");

  // let testsPassedArg; let testsTotalArg; let testsToRunArg;
  if(testsToRun.numTotalTests == 0) {
    console.log(chalk.yellow("ATTENTION: ") + "No visual regression tests were found. Make sure your test files are in a folder named 'hubble-tests' located in the root directory of your application.");
  } else {                                        // run specified group or test
    var {testsPassed, testsTotal, testResults} = await logTests(testsToRun, update);
  }
  browser.close();
  server.close();

  // create XML report if it doesn't exist or we are running all tests,
  // update XML report if it exists and we're running a subset of all tests
  console.log(groupName, testName, fs.existsSync(screenshotDir + 'report.xml'), (groupName || testName) && fs.existsSync(screenshotDir + 'report.xml'));
  if((groupName || testName) && fs.existsSync(screenshotDir + 'report.xml')){
    updateXML(testsPassed, testsTotal, testResults);
  } else {
    createXML(testsPassed, testsTotal, testResults);
  }

  let endTimeAll = process.hrtime(startTimeAll);
  console.log("Time taken: %d.%d seconds\n", endTimeAll[0], Math.trunc(endTimeAll[1]/1000000));
}




