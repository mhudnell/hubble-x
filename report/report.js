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
  let xmlString = fs.readFileSync(__dirname + '/../screenshots/report.xml');

  // create dist folder if doesnt exist
  if(!fs.existsSync(__dirname + '/dist')){
    fs.mkdirSync(__dirname + '/dist');
  }

  xmlParseString(xmlString).then((xml) => {
    checkDirsExist(xml);
    let report = xml['vizregResults'];
    // console.log(util.inspect(xml, false, null));

    // create index.html
    ejsRenderFile(__dirname + '/src/pages/index.ejs', {report: report}).then((pageContent) => {
      return ejsRenderFile(__dirname + '/src/layouts/layout.ejs', { body: pageContent, dirname: __dirname,
                                                                    report: report, octicons: octicons });
    })
    .then((layoutContent) => {
      fs.writeFile(__dirname + '/dist/index.html', layoutContent, (err) => {  
        if (err) throw err;
      });
    })

    // create html pages for all tests
    let groupList = report['Group'];
    for(let groupIndex in groupList){
      // let group = groupList[groupIndex];
      let groupName = groupList[groupIndex]['$']['name']
      let testList = groupList[groupIndex]['Test']
      for(let testIndex in testList){
        let test = testList[testIndex];
        let testName = testList[testIndex]['$']['name']

        ejsRenderFile(__dirname + '/src/pages/test.ejs', {dirname: __dirname, groupName: groupName,
                                                           testName: testName, test: test}).then((pageContent) => {
          return ejsRenderFile(__dirname + '/src/layouts/layout.ejs', { body: pageContent, dirname: __dirname,
                                                                      report: report, octicons: octicons });
        })
        .then((layoutContent) => {
          fs.writeFile(__dirname + '/dist/' + groupName + '/' + testName + '.html', layoutContent, (err) => {  
            if (err) throw err;
          });
        })
      }
    }
  })
}

function checkDirsExist(xml){
  // create dist folder if doesnt exist
  if(!fs.existsSync(__dirname + '/dist')){
    fs.mkdirSync(__dirname + '/dist');
  }

  // create folder for each group within dist
  let groupList = xml['vizregResults']['Group'];
  for(let groupIndex in groupList){
    let group = groupList[groupIndex];
    if(!fs.existsSync(__dirname + '/dist/' + group['$']['name'])){
      fs.mkdirSync(__dirname + '/dist/' + group['$']['name']);
    }
  }

}

