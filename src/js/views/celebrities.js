import Container from 'react-container';
import React from 'react';
import { Link, UI } from 'touchstonejs';
const data = require("../../data/data");

module.exports = React.createClass({
  statics: {
    navigationBar: 'main',
    getNavigation () {
      return {
        title: 'Celebrities'
      }
    }
  },

  renderCelebrity: function (celebrity, index) {
    return (<Link to="tabs:diet" transition="show-from-right" key={index}>
      <UI.Item showDisclosureArrow>
        <UI.ItemInner>
          {celebrity.name}
        </UI.ItemInner>
      </UI.Item>
    </Link>)
  },

  render: function () {
    return (
      <Container scrollable>
        <UI.Group>
          <UI.GroupBody>
            {data.celebrities.map((celebrity, index) => this.renderCelebrity(celebrity, index))}
          </UI.GroupBody>
        </UI.Group>
      </Container>
    );
  }
});
