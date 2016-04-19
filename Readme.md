Lifted from https://github.com/emberjs/ember-legacy-controllers/blob/master/addon/utils/sortable-mixin.js.

Example:

```

var sortable = require('ember-sortable-mixin');

App.ArrayController = Em.Controller.extend(sortable.Array, {

  // access sorted content as .sortableMixin 
    
  model: [],
  sortProperties: ['a'],
  sortAscending: true,

});

```