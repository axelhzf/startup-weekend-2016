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
				title: "Recipe",
				leftLabel: 'Recipes',
				leftArrow: true,
				leftAction: () => { app.transitionTo('tabs:recipes', { transition: 'reveal-from-right', viewProps: {celebrity: props.celebrity } }) },
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
		const recipe = this.props.recipe;

		return (
			<Container scrollable className="recipe">

				<div className="recipe-header" style={{backgroundImage: `url(img/data/${recipe.coverPhoto})`}}>
					<div className="recipe-name">
						<p>{recipe.name}</p>
					</div>
				</div>

				<UI.GroupHeader>Description</UI.GroupHeader>
				<UI.GroupBody>
					<UI.GroupInner>
						{recipe.description}
					</UI.GroupInner>
				</UI.GroupBody>

				<UI.GroupHeader>Ingredients</UI.GroupHeader>
				<UI.GroupBody>
					<UI.GroupInner>
						<ul>
							{ recipe.ingredients.map((ingredient, index) => <li key={index}>{ingredient}</li>) }
						</ul>
					</UI.GroupInner>
				</UI.GroupBody>

				<UI.GroupHeader>Details</UI.GroupHeader>
				<UI.GroupBody>
					<UI.GroupInner>
						<ul>
							<li>Kcals: {recipe.kcal}</li>
							<li>Fats: {recipe.fat}</li>
							<li>Proteins: {recipe.proteins}</li>
							<li>Carbs: {recipe.carbs}</li>
							<li>Cooking time: {recipe.time}</li>
						</ul>
					</UI.GroupInner>
				</UI.GroupBody>

				<UI.GroupHeader>Recipe</UI.GroupHeader>
				<UI.GroupBody>
					<UI.GroupInner>
						{recipe.recipe}
					</UI.GroupInner>
				</UI.GroupBody>

			</Container>
		);
	}
});
