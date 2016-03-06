import React from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';
import ReactDOM from 'react-dom';
import {
  Container,
  createApp,
  UI,
  View,
  ViewManager
} from 'touchstonejs';

// App Config
// ------------------------------

const PeopleStore = require('./stores/people')
const peopleStore = new PeopleStore()

var App = React.createClass({
  mixins: [createApp()],

  childContextTypes: {
    peopleStore: React.PropTypes.object
  },

  getChildContext () {
    return {
      peopleStore: peopleStore
    };
  },

  componentDidMount () {
    // Hide the splash screen when the app is mounted
    if (navigator.splashscreen) {
      navigator.splashscreen.hide();
    }
  },

  render () {
    let appWrapperClassName = 'app-wrapper device--' + (window.device || {}).platform

    return (
      <div className={appWrapperClassName}>
        <div className="device-silhouette">
          <ViewManager name="app" defaultView="main">
            <View name="main" component={MainViewController}/>
          </ViewManager>
        </div>
      </div>
    );
  }
});

// Main Controller
// ------------------------------

//var lastSelectedTab = localStorage.lastSelectedTab || 'celebrities';
var lastSelectedTab = 'celebrities';

var MainViewController = React.createClass({

  onViewChange (nextView) {
    lastSelectedTab = nextView;
    localStorage.lastSelectedTab = lastSelectedTab;
  },

  render () {
    return (
      <Container>
        <UI.NavigationBar name="main"/>
        <ViewManager name="tabs" defaultView={lastSelectedTab} onViewChange={this.onViewChange}>
          <View name="celebrities" component={require('./views/celebrities')}/>
          <View name="celebrity" component={require('./views/celebrity')}/>
          <View name="recipes" component={require('./views/recipes')}/>
          <View name="recipes-2" component={require('./views/recipes-2')}/>
          <View name="recipe" component={require('./views/recipe')}/>
          <View name="shopping-list" component={require('./views/shopping-list')}/>
          <View name="subscribe" component={require('./views/subscribe')}/>
        </ViewManager>
      </Container>
    );
  }
});

function startApp() {
  if (window.StatusBar) {
    window.StatusBar.styleDefault();
  }
  ReactDOM.render(<App />, document.getElementById('app'));
}

if (!window.cordova) {
  startApp();
} else {
  document.addEventListener('deviceready', startApp, false);
}
