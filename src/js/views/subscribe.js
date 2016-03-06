import Container from 'react-container';
import React from 'react';
import { Link, UI } from 'touchstonejs';
const data = require("../../data/data");
var PieChart = require('react-d3').PieChart;

module.exports = React.createClass({
  statics: {
    navigationBar: 'main',
    getNavigation (props, app) {
      return {
        title: "Subscribe",
        leftLabel: 'Celebrities',
        leftArrow: true,
        leftAction: () => { app.transitionTo('tabs:celebrities', {transition: 'reveal-from-right'}) }
      }
    }
  },

  render: function () {
    return (
      <Container scrollable className="subscribe">
        <h1>Premium</h1>
        <h2>0,79€/mo</h2>

        <UI.GroupInner>
          <p>What kind of demonic pact did these celebrities to get this sexy body ?</p>

          <p>Get the changes made in theirs eating habits and Smile with ours innocent gags !<br/>
          Get exclusive weekly updates and performs especially effective diets .</p>

          <p>Stop wasting the time and unlock all available content just for 0.79 € per month , and be aware of some details that you can get :) .</p>
        </UI.GroupInner>

        <UI.Button type="primary">Buy</UI.Button>

      </Container>
    );
  }
});
