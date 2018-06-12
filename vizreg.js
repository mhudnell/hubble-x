#!/usr/bin/env node

const program = require('commander');
const vizreg = require('./vizreg_lib.js');

program
  .version('0.1.0')
  .description('Visual regression tool for React components. Provide a test name to run one test. Provide no test names to run all tests.')
  .arguments('[test-name]')
  .action((test) => {
    testVal = test;
  });

program.parse(process.argv);

if(typeof testVal === 'undefined') {
  vizreg();
} else {
  vizreg(testName=testVal);
}