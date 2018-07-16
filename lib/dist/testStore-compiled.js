"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var TestStore = function () {
  function TestStore() {
    _classCallCheck(this, TestStore);

    this.groups = {};
  }

  _createClass(TestStore, [{
    key: "addTest",
    value: function addTest(groupName, testName, reactFunc, clip) {
      if (!this.groups[groupName]) {
        this.groups[groupName] = {
          groupName: groupName,
          tests: {}
        };
      }

      this.groups[groupName].tests[testName] = {
        testName: testName,
        reactFunc: reactFunc,
        clip: clip
      };
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

  }, {
    key: "getTests",
    value: function getTests() {
      var toReturn = {},
          allGroups = [],
          numGroups = 0,
          numTotalTests = 0;

      for (var groupKey in this.groups) {
        var groupToAdd = {};
        var groupTests = [];
        var group = this.groups[groupKey];
        groupToAdd.groupName = group.groupName;
        var tests = group.tests;
        for (var testKey in tests) {
          var testSpec = {};
          var test = tests[testKey];
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

  }, {
    key: "showTests",
    value: function showTests() {
      console.log("logging all tests...");
      for (var group in this.groups) {
        console.log(this.groups[group]);
      }
    }
  }]);

  return TestStore;
}();

module.exports = new TestStore();
