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
    return (
      <div className="celebrities-item">
        <Link to="tabs:celebrity" transition="show-from-right" key={index} viewProps={{ celebrity: celebrity }}>
          <UI.Item showDisclosureArrow>
            <div className="cover-photo" style={{"background-image" : `url(${celebrity.coverPhoto})`}}>
              <div className="name">{celebrity.name}</div>
            </div>
          </UI.Item>
        </Link>
    </div>
        )
  },

  render: function () {
    return (
      <Container scrollable className="celebrities">
        {data.celebrities.map((celebrity, index) => this.renderCelebrity(celebrity, index))}
      </Container>
    );
  }
});
