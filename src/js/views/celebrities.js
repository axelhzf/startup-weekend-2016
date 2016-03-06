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

    const linkToParams = celebrity.premium ?
    {to: "tabs:subscribe", transition: "show-from-right"}:
    {to: "tabs:celebrity", transition: "show-from-right", viewProps:{celebrity}};

    return (
      <div className="celebrities-item" key={index}>
        <Link {...linkToParams}>
          <UI.Item showDisclosureArrow>
            <div className="cover-photo" style={{backgroundImage : `url(img/data/${celebrity.coverPhoto})`}}>
              <div className="name">{celebrity.name}</div>
              {celebrity.premium? <div className="premium-badge">Premium</div> : ""}
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
