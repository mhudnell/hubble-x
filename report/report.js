const { promisify } = require('util');
const ejsRenderFile = promisify(require('ejs').renderFile);
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const xmlParseString = promisify(require('xml2js').parseString);
const octicons = require("octicons");

//dev
// const util = require('util');

exports.openHTML = function() {
  var childProc = require('child_process');
  childProc.exec('open -a "Google Chrome" file://' + __dirname + '/dist/index.html', () => {});
}


exports.buildHTML = function() {
  var files = fs.readdirSync(__dirname + '/../screenshots/expected/');
  var names = files.map(file => path.basename(file, '.png'));

  let xmlString = fs.readFileSync(__dirname + '/../screenshots/report.xml');


  xmlParseString(xmlString).then((xml) => {
    let report = xml['vizregResults'];
    // console.log(util.inspect(xml, false, null));

    // create index.html
    ejsRenderFile(__dirname + '/src/pages/index.ejs', {}).then((pageContent) => {
      return ejsRenderFile(__dirname + '/src/layouts/layout.ejs', { body: pageContent, names: names, 
                                                                    report: report, octicons: octicons });
    })
    .then((layoutContent) => {
      fs.writeFile(__dirname + '/dist/index.html', layoutContent, (err) => {  
        if (err) throw err;
      });
    })

    // create html pages for all tests
    names.forEach((name) => {
      ejsRenderFile(__dirname + '/src/pages/test.ejs', {name: name}).then((pageContent) => {
        return ejsRenderFile(__dirname + '/src/layouts/layout.ejs', { body: pageContent, names: names, 
                                                                    report: report, octicons: octicons });
      })
      .then((layoutContent) => {
        fs.writeFile(__dirname + '/dist/'+name+'.html', layoutContent, (err) => {  
          if (err) throw err;
        });
      })
    })
  })
}

