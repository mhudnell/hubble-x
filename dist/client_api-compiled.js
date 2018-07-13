'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var testStore = require('./testStore-compiled.js');

var ClientApi = function () {
  function ClientApi() {
    var testStore = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : testStore;

    _classCallCheck(this, ClientApi);

    this.testStore = testStore;
  }

  _createClass(ClientApi, [{
    key: 'testGroup',
    value: function testGroup(groupName) {
      var api = {
        groupName: groupName
      };

      api.add = function (testName, reactFunc, clip) {
        testStore.addTest(groupName, testName, reactFunc, clip);
        return api;
      };

      return api;
    }
  }]);

  return ClientApi;
}();

module.exports = new ClientApi();
