
class TestStore {
  constructor() {
    this.groups = {}
  }

  addTest(groupName, testName, reactFunc, clip) {
    if(!this.groups[groupName]) {
      this.groups[groupName] = {
        groupName,
        tests: {},
      }
    }

    this.groups[groupName].tests[testName] = {
      testName,
      reactFunc,
      clip,
    }
  }

  // DEPRECATED: Returns all test names, along with their react components.
  // getComponents() {
    // for(var groupKey in this.groups){
    //   let groupComponents = {};
    //   let group = this.groups[groupKey];
    //   groupComponents.groupName = group.groupName;
    //   let tests = group.tests;
    //   for(var testKey in tests){
    //     let test = tests[testKey];
    //     groupComponents[test.testName] = test.reactFunc ? test.reactFunc : null;
    //   }
    //   allComponents[group.groupName] = groupComponents;
    // }
    // return { groups: allComponents };
  // }

  // Returns all test information in a javascript object.
  getTests() {
    let toReturn = {},
      allGroups = [],
      numGroups = 0,
      numTotalTests = 0;

    for(var groupKey in this.groups){
      let groupToAdd = {};
      let groupTests = [];
      let group = this.groups[groupKey];
      groupToAdd.groupName = group.groupName;
      let tests = group.tests;
      for(var testKey in tests){
        let testSpec = {};
        let test = tests[testKey];
        testSpec.testName = test.testName;
        testSpec.clip = test.clip ? test.clip : null;
        testSpec.reactFunc = test.reactFunc ? test.reactFunc : null;
        groupTests.push(testSpec);
        numTotalTests++;
      }
      groupToAdd.tests = groupTests;
      allGroups.push(groupToAdd);
      numGroups++;
    }

    toReturn.groups = allGroups;
    toReturn.numGroups = numGroups;
    toReturn.numTotalTests = numTotalTests;
    
    return toReturn;
  }

  // log test for debugging purposes
  showTests() {
    console.log("logging all tests...");
    for(var group in this.groups){
      console.log(this.groups[group]);
    }
  }
}

module.exports = new TestStore();
