
/*
*   write component tests here, can specify screenshot size
*   key must match React component name in 'client/src/testComponents.js` (this name is used in the url we navigate to)
*   clip must be of format {x:?, y:?, width:?, height:?}
*/
const tests = {
  Accordion: { clip: {x:0, y:0, width:800, height:200} },
  AccordionGroup: { clip: {x:0, y:0, width:800, height:750} },
  Alert: {clip: {x:0, y:0, width:800, height:100}},
  Button: {clip: {x:0, y:0, width:500, height:100}},
  Card: { clip: {x:0, y:0, width:800, height:300} },
}

module.exports = tests;
