var sortable = require('ember-sortable-mixin');

Em.TEMPLATES['index'] = Em.HTMLBars.template(require('./template'));

App = Em.Application.create();

App.IndexController = Em.Controller.extend(sortable.Array, {

  sortProperties: ['char'],
  sortAscending: true,

});

App.IndexRoute = Em.Route.extend({

  model: function(){
    return ['c' , 'a', 'b'].map(function(char){
      return {
        char: char
      }
    });
  }

});
