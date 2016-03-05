import Container from 'react-container';
import React from 'react';
import { Link, UI } from 'touchstonejs';
const data = require("../../data/data");

module.exports = React.createClass({
	statics: {
		navigationBar: 'main',
		getNavigation () {
			return {
				title: 'Diet'
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
		const diet = data.celebrities[0].diet;
		return (
			<Container scrollable className="diet">
				<Container direction="column">
					<Container fill scrollable ref="scrollContainer">
						<h1>{diet.name}</h1>
						<img className="cover" style={{"background-image": `url(${diet.coverPhoto})`}}></img>
						<p className="description">
							{diet.description}
						</p>
					</Container>
				</Container>
			</Container>
		);
	}
});
