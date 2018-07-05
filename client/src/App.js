import React, { Component } from 'react';
import './App.css';
import { BrowserRouter as Router, Route, Switch} from 'react-router-dom';

import { BandwidthProvider } from '@bandwidth/shared-components';

import sharedComponents from './testComponents.js'

class App extends Component {
  render() {
    return (
      <Router>
        <Switch>
          <Route exact={true} path="/" render={() => (
            <h1>Welcome to the Shared Component display tool</h1>
          )}/>
          <Route exact={true} path="/c/:component" component={SharedComponent} />
          <Route path='*' component={Error404} status={404} />
        </Switch>
      </Router>
    );
  }
}

const SharedComponent = ({ match }) => {
  var DynamComponent = sharedComponents[match.params.component];
  if(!DynamComponent) return (<Error404/>);
  
  return (
    <BandwidthProvider>
      <h1> </h1>
      <DynamComponent/>
    </BandwidthProvider>
  );
}

// 404 page
class Error404 extends Component {
  render() {
    return (
      <h1>404</h1>
    );
  }
}


export default App;

