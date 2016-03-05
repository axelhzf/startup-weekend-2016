import Container from 'react-container';
import React from 'react';
import { Link, UI } from 'touchstonejs';
const data = require("../../data/data");

module.exports = React.createClass({
	statics: {
		navigationBar: 'main',
		getNavigation (props, app, filterStarred) {
			return {
				title: "Diet",
				leftLabel: 'Celebrities',
				leftArrow: true,
				leftAction: () => { app.transitionTo('tabs:celebrities', { transition: 'reveal-from-right' }) },
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
		const celebrity = data.celebrities[0];
		const diet = celebrity.diet;
		return (
			<Container scrollable className="celebrity">
				<div className="celebrity-header" style={{"background-image": `url(${celebrity.coverPhoto})`}}>
					<div className="fade">
						<div className="diet-name">{diet.name}</div>
					</div>
				</div>

				<UI.Group>
					<UI.GroupHeader>{celebrity.name}</UI.GroupHeader>
					<UI.GroupBody>
						<UI.GroupInner>
							{celebrity.description}
						</UI.GroupInner>
					</UI.GroupBody>

					<UI.GroupHeader>Diet description</UI.GroupHeader>
					<UI.GroupBody>
						<UI.GroupInner>
						{diet.description}
						</UI.GroupInner>
					</UI.GroupBody>

					<UI.GroupHeader>Nutritional summary</UI.GroupHeader>
					<UI.GroupBody>
						<UI.GroupInner>

						</UI.GroupInner>
					</UI.GroupBody>

					<Link to="tabs:celebrity" transition="show-from-right" viewProps={{ diet: diet }}>
						<UI.Button type="primary">
							Subscribe to diet
						</UI.Button>
					</Link>

				</UI.Group>


			</Container>
		);
	}
});
