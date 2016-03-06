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
      </Container>
    );
  }
});
