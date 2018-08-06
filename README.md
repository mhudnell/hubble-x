# hubble
A visual regression testing tool for React components

* [Installation](#installation)
* [Usage](#usage)
* [API](#api)
* [CLI](#cli)

## Installation
`npm i hubble-x --save-dev`

## Usage
Create a folder named `viz-tests` in the root of your React app. This is where you will keep your tests. Make sure your tests end with the `.test.js` extension. Example repository structure:
```
your-react-app/
├── node_modules/
│   └── vizreg/
└── viz-tests/
    └── your-tests.test.js
```

An example test file:
```javascript
// Accordion.test.js
import React from 'react';
import hubble from 'hubble-x';

import Accordion from '../components/Accordion';

hubble.testGroup('Accordion')
  .add('expanded', () => (
    <Accordion label="Hello" isExpanded="true">
      Some content
    </Accordion>
  ))
  .add('not expanded', () => (
    <Accordion label="Hello" isExpanded="false">
      Some content
    </Accordion>
  ), {x:0, y:0, width:800, height:200});

```

Run your tests: `$    npx hubble`

View the report: `$    npx hubble report`

## API

**.testGroup(groupName)**
  * `groupName` \<string> The name of this test group.

**.add(testName, reactFn, [clip])**
  * `testName` \<string> The name of the test to be added.
  * `reactFn` \<function()> A function which returns a react component.
  * `clip` \<Object> An object which specifies clipping region of the page. Should have the following fields:
    * `x` \<number> x-coordinate of top-left corner of clip area.
    * `y` \<number> y-coordinate of top-left corner of clip area.
    * `width` \<number> width of clipping area.
    * `height` \<number> height of clipping area.
    * **default:** `{x: 0, y: 0, width: 800, height: 600}`

## CLI

Run all tests: `$    npx hubble`

Update the "expected" image for all tests: `$    npx hubble --update`

View HTML report: `$    npx hubble report`

## License

The source of this library is licensed under the MIT license