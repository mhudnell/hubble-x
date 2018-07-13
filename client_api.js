const testStore = require('./testStore-compiled.js');

class ClientApi {
  constructor(testStore = testStore) {
    this.testStore = testStore;
  }

  testGroup(groupName){
    const api = {
      groupName,
    };

    api.add = (testName, reactFunc, clip) => {
      testStore.addTest(groupName, testName, reactFunc, clip);
      return api;
    };

    return api;
  };

}

module.exports = new ClientApi();


