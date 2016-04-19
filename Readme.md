Emulate `ArrayController` in Ember 2.x.

### Example:

```js

var sortable = require('ember-sortable-mixin');

App.ArrayController = Em.Controller.extend(sortable.Array, {

  // access sorted content as .sortableMixin 
    
  model: [],
  sortProperties: ['a'],
  sortAscending: true,

});

```