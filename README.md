# hubble
A visual regression testing tool for React components

* [Installation](#installation)
* [Usage](#usage)
* [API](#api)
* [CLI](#cli)

## Installation
`npm i hubble-x --save-dev`

## Usage
Create a folder named `hubble-tests` in the root of your React app. This is where you will keep your tests. Make sure your tests end with the `.test.js` extension. Example repository structure:
```
your-react-app/
├── node_modules/
│   └── hubble-x/
└── hubble-tests/
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

## Screenshots

Terminal output:

![presi_gif](https://user-images.githubusercontent.com/12748650/43844566-0dac7e2c-9af8-11e8-9237-38453564899e.gif)

HTML report:

<img src="https://user-images.githubusercontent.com/12748650/43844680-52358098-9af8-11e8-9c8d-0f6154e5f1e3.png" width="400" ></img>
<img src="https://user-images.githubusercontent.com/12748650/43844702-59ca3e98-9af8-11e8-966a-ea8df8bae9f4.png" width="400" ></img>


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

Run a group of tests: `$    npx hubble GroupName`

Run a single test: `$    npx hubble GroupName/TestName`

Update the "expected" image for tests: `$    npx hubble --update`

View HTML report: `$    npx hubble report`

## License

The source of this library is licensed under the MIT license
