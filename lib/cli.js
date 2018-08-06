#!/usr/bin/env node

const program = require('commander');
const vizreg = require('./vizreg_lib.js');
const report = require('../report/report.js');

program
  .version('0.1.0')
  .option('-u, --update', 'update the expected images for the specified set of tests', false)
  .description('Visual regression tool for React components. Provide no arguments to run all tests. Provide a group name to run all tests in a group. Provide a group name and test name (e.g. npx hubble group1/test1) to run a single test.')
  .arguments('[test-spec]')
  .action((spec) => {
    testSpec = spec;
  });

program.parse(process.argv);

if(typeof testSpec === 'undefined') {
  vizreg({ update: program.update});
} else if(testSpec == 'report'){
  report.buildHTML();
  report.openHTML();
} else {
  let delimited = testSpec.split("/");
  let groupName = delimited[0];
  let testName = delimited[1];

  vizreg({groupName:groupName, testName:testName, update:program.update});
}

