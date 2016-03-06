import Container from 'react-container';
import React from 'react';
import { Link, UI } from 'touchstonejs';
const data = require("../../data/data");
var PieChart = require('react-d3').PieChart;
import { Mixins } from 'touchstonejs';

module.exports = React.createClass({

  mixins: [Mixins.Transitions],

  statics: {
    navigationBar: 'main',
    getNavigation (props, app) {
      return {
        title: "Recipes",
        leftLabel: 'Celebrity',
        leftArrow: true,
        leftAction: () => {
          app.transitionTo('tabs:celebrity', {
            transition: 'reveal-from-right',
            viewProps: {celebrity: props.celebrity}
          })
        }
      }
    }
  },

  getInitialState() {
    return {
      currentMealIndex: {
        breakfast: 0,
        appetizer: 0,
        lunch: 0,
        snack: 0,
        dinner: 0
      }
    }
  },

  onTapDislike: function (e, meal) {
    e.stopPropagation();

    const celebrity = this.props.celebrity;
    const diet = celebrity.diet;
    const recipes = diet.meals;

    const total = recipes[meal].length;
    const newIndex = (this.state.currentMealIndex[meal] + 1 ) % total;

    this.state.currentMealIndex[meal] = newIndex;
    this.setState(this.state.currentMealIndex);
  },

  onTapRecipe: function (recipe) {
    const celebrity = this.props.celebrity;
    this.transitionTo('tabs:recipe', {transition: 'reveal-from-left', viewProps: {celebrity, recipe}});
  },

  renderRecipe: function (meal, recipe) {
    return (
      <UI.Item showDisclosureArrow onClick={() => this.onTapRecipe(recipe)}>
        <div className="recipe-item" style={{backgroundImage: `url(img/data/${recipe.coverPhoto})`}}>
          <div className="recipe-name">
            <p>{meal}: {recipe.name}</p>
          </div>
          <div className="recipe-dislike" onClick={(e) => this.onTapDislike(e, meal)}>
            <span className="ionicons ion-close-round"/> Dislike
          </div>
        </div>
      </UI.Item>
    );
  },

  render: function () {
    const celebrity = this.props.celebrity;
    const diet = celebrity.diet;
    const recipes = diet.meals;

    return (
      <Container scrollable className="recipes">

        <div className="celebrity-header" style={{backgroundImage: `url(img/data/${celebrity.coverPhoto})`}}>
          <div className="fade">
            <div className="diet-name-container"><span className="diet-name">{diet.name}</span></div>
            <div><span className="diet-day">Day 2</span></div>
          </div>
        </div>

        <UI.Group>
          {this.renderRecipe("breakfast", recipes.breakfast[this.state.currentMealIndex.breakfast])}
          {this.renderRecipe("appetizer", recipes.appetizer[this.state.currentMealIndex.appetizer])}
          {this.renderRecipe("lunch", recipes.lunch[this.state.currentMealIndex.lunch])}
          {this.renderRecipe("snack", recipes.snack[this.state.currentMealIndex.snack])}
          {this.renderRecipe("dinner", recipes.dinner[this.state.currentMealIndex.dinner])}
        </UI.Group>

        <UI.Group>
          <Link to="tabs:shopping-list" transition="show-from-right" viewProps={{ celebrity }}>
            <UI.Button type="primary">
              Shopping List
            </UI.Button>
          </Link>
        </UI.Group>

      </Container>
    );
  }
});
