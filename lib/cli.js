#!/usr/bin/env node

const program = require('commander');
const vizreg = require('./vizreg_lib.js');
const report = require('../report/report.js');

program
  .version('0.1.0')
  .option('-u, --update', 'Update the expected images', false)
  .description('Visual regression tool for React components. Provide a test name to run one test. Provide no test names to run all tests.')
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

