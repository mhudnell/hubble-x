const { promisify } = require('util');
const ejsRenderFile = promisify(require('ejs').renderFile);
const fs = require('fs');
const path = require('path');

var files = fs.readdirSync('../screenshots/expected/');
var names = files.map(file => path.basename(file, '.png'));

ejsRenderFile('src/pages/index.ejs', {}).then((pageContent) => {
  return ejsRenderFile('src/layouts/layout.ejs', {body: pageContent, names: names});
})
.then((layoutContent) => {
  fs.writeFile('dist/index.html', layoutContent, (err) => {  
    if (err) throw err;

    // success case, the file was saved
    console.log('html report generated!');
  });
})

names.forEach((name) => {
  ejsRenderFile('src/pages/test.ejs', {name: name}).then((pageContent) => {
    return ejsRenderFile('src/layouts/layout.ejs', {body: pageContent, names: names});
  })
  .then((layoutContent) => {
    fs.writeFile('dist/'+name+'.html', layoutContent, (err) => {  
      if (err) throw err;

      // success case, the file was saved
      console.log('html report generated!');
    });
  })
})




// ejs.renderFile('src/index.ejs', {}).then(function(html) {
//   fs.writeFile('index.html', html, (err) => {  
//     if (err) throw err;

//     // success case, the file was saved
//     console.log('html report generated!');
//   });
// })