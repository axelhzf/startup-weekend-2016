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
        title: "Shopping list",
        leftLabel: 'Recipes',
        leftArrow: true,
        leftAction: () => { app.transitionTo('tabs:recipes', { transition: 'reveal-from-right', viewProps: {celebrity: props.celebrity } }) },
      }
    }
  },

  render: function () {
    const celebrity = this.props.celebrity;
    const shoppingList = this.props.celebrity.diet.shoppingList;

    return (
      <Container scrollable className="shopping-list">

        <div className="celebrity-header" style={{backgroundImage: `url(img/data/${celebrity.coverPhoto})`}}>
          <div className="fade">
            <div className="diet-name">Shopping list</div>
          </div>
        </div>

        <UI.Group>
          <UI.GroupBody>
            <UI.GroupInner>
              <ul>
                { shoppingList.map((item, index) => <li key={index}>{item}</li>) }
              </ul>
            </UI.GroupInner>
          </UI.GroupBody>
        </UI.Group>

        <UI.Group>
          <UI.Button type="primary">
            Buy
          </UI.Button>
        </UI.Group>

      </Container>
    );
  }
});
