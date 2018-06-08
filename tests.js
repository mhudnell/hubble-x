
const testSuite = require('./viz_reg.js');

// write component tests here, can specify screenshot size
const tests = {
  Accordion: async () => await testSuite.testOne('Accordion'),
  AccordionGroup: async () => await testSuite.testOne('AccordionGroup', clip={x:0, y:0, width:800, height:750})
}



module.exports = {
  testOne: async function(name) {
    await tests[name]();
  },

  testAll: async function() {
    for(key in tests){
      await tests[key]();
    }
  }
}