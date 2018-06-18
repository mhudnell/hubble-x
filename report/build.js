const { promisify } = require('util');
const ejsRenderFile = promisify(require('ejs').renderFile);
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const xmlParseString = promisify(require('xml2js').parseString);

//dev
// const util = require('util');

var files = fs.readdirSync('../screenshots/expected/');
var names = files.map(file => path.basename(file, '.png'));

let xmlString = fs.readFileSync(__dirname + '/../screenshots/report.xml');


xmlParseString(xmlString).then((xml) => {
  let report = xml['vizregResults'];
  // console.log(util.inspect(xml, false, null));

  // create index.html
  ejsRenderFile('src/pages/index.ejs', {}).then((pageContent) => {
    return ejsRenderFile('src/layouts/layout.ejs', {body: pageContent, names: names, report: report});
  })
  .then((layoutContent) => {
    fs.writeFile('dist/index.html', layoutContent, (err) => {  
      if (err) throw err;
    });
  })

  // create html pages for all tests
  names.forEach((name) => {
    ejsRenderFile('src/pages/test.ejs', {name: name}).then((pageContent) => {
      return ejsRenderFile('src/layouts/layout.ejs', {body: pageContent, names: names, report: report});
    })
    .then((layoutContent) => {
      fs.writeFile('dist/'+name+'.html', layoutContent, (err) => {  
        if (err) throw err;
      });
    })
  })
})
