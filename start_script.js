const express = require('express');
const app = express();
// const tests = require('./test_suite.js');
const tests = require('./tests.js');

app.use(express.static('/Users/mhudnell/dev/viz_reg/client/build'));
app.get('*', function (req, res) {
  res.sendFile('/Users/mhudnell/dev/viz_reg/client/build/index.html');
});

// start server on local port 4000
var server = app.listen(4000);

(async () => {
  await tests.testAll();
  await server.close();
})();
