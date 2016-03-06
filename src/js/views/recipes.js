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
				title: "Recipes",
				leftLabel: 'Celebrity',
				leftArrow: true,
				leftAction: () => { app.transitionTo('tabs:celebrity', { transition: 'reveal-from-right' }) },
			}
		}
	},

	renderRecipe: function (meal, recipe) {
		return (
			<Link to="tabs:recipe" transition="show-from-right" viewProps={{ recipe }}>
				<UI.Item showDisclosureArrow>
					<div className="recipe-item" style={{backgroundImage: `url(img/data/${recipe.coverPhoto})`}}>

						<div className="recipe-name">
							<p>{meal}: {recipe.name}</p>
						</div>

						<div className="recipe-dislike">
							<span className="ionicons ion-close-round"/> Dislike
						</div>

					</div>
				</UI.Item>
			</Link>
		);
	},

	render: function () {
		const celebrity = data.celebrities[0];
		const diet = celebrity.diet;
		const recipes = diet.meals;

		return (
			<Container scrollable className="celebrity">
				<div className="celebrity-header" style={{backgroundImage: `url(img/data/${celebrity.coverPhoto})`}}>
					<div className="fade">
						<div className="diet-name">{diet.name} : Monday</div>
					</div>
				</div>

				<UI.Group>
					<div className="recipes">
						{this.renderRecipe("Breakfast", recipes.breakfast[0])}
						{this.renderRecipe("Lunch", recipes.lunch[0])}
						{this.renderRecipe("Dinner", recipes.dinner[0])}
					</div>

					<Link to="tabs:celebrity" transition="show-from-right" viewProps={{ diet: diet }}>
						<UI.Button type="primary">
							Shopping List
						</UI.Button>
					</Link>

				</UI.Group>


			</Container>
		);
	}
});
