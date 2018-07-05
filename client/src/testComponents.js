import React from 'react';
import { Accordion, AccordionGroup, Alert, Button, Card } from '@bandwidth/shared-components';

// all shared component test cases go under here
var testComponents = {};

testComponents["Accordion"] = () => (
  <Accordion label="Hello" isExpanded="true">
    Some content
  </Accordion>
);

testComponents["AccordionGroup"] = () => (
  <AccordionGroup startExpandedKey={3}>
    <Accordion key={0} label="Option 1">Content 1</Accordion>
    <Accordion key={1} label="Option 2">Content 2</Accordion>
    <Accordion key={2} label="Option 2">Content 2</Accordion>
    <Accordion key={3} label="Option 3">Content 3</Accordion>
    <Accordion key={4} label="Option 4">Content 4</Accordion>
    <Accordion key={5} label="Option 5">Content 5</Accordion>
    <Accordion key={6} label="Option 6">Content 6</Accordion>
  </AccordionGroup>
);

testComponents["Alert"] = () => (
  <Alert type="info">
    Hello, world
  </Alert>
);

testComponents["Button"] = () => (
  <div>
    <Button.Large>Primary Large</Button.Large>
    <Button>Primary Medium</Button>
    <Button.Small>Primary Small</Button.Small>
  </div>
);

testComponents["Card"] = () => (
  <Card>
    <Card.Header image={'http://dev.bandwidth.com/design-system/source/images/blue.png'} title="My Card" />
    <Card.Section>
      <p>Cards may have a CardHeader with an image and/or title which dictate how the top of the card will look.</p>
    </Card.Section>
    <Card.Section>
      <p>Cards may also have multiple CardSections, which are visually separated within each Card.</p>
    </Card.Section>
  </Card>
);


export default testComponents;