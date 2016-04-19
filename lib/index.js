/**
 * Module dependencies.
 */
require('ember');


/**
 * Lifted from https://github.com/emberjs/ember-legacy-controllers/blob/master/addon/utils/sortable-mixin.js
 *
 * 
 */
var get = Em.get;
var MutableEnumerable = Em.MutableEnumerable;
var compare = Em.compare;
var addObserver = Em.addObserver;
var removeObserver = Em.removeObserver;
var computed = Em.computed;
var Mixin = Em.Mixin;
var observer = Em.observer;
var notEmpty = computed.notEmpty;

exports.Mixin = SortableMixin = Em.Mixin.create(MutableEnumerable, {

  /**
    Specifies which properties dictate the `arrangedContent`'s sort order.
    When specifying multiple properties the sorting will use properties
    from the `sortProperties` array prioritized from first to last.
    @property {Array} sortProperties
    @private
  */
  sortProperties: null,

  /**
    Specifies the `arrangedContent`'s sort direction.
    Sorts the content in ascending order by default. Set to `false` to
    use descending order.
    @property {Boolean} sortAscending
    @default true
    @private
  */
  sortAscending: true,

  /**
    The function used to compare two values. You can override this if you
    want to do custom comparisons. Functions must be of the type expected by
    Array#sort, i.e.,
    *  return 0 if the two parameters are equal,
    *  return a negative value if the first parameter is smaller than the second or
    *  return a positive value otherwise:
    ```javascript
    function(x, y) { // These are assumed to be integers
      if (x === y)
        return 0;
      return x < y ? -1 : 1;
    }
    ```
    @property sortFunction
    @type {Function}
    @default Ember.compare
    @private
  */
  sortFunction: compare,

  orderBy(item1, item2) {
    var result = 0;
    var sortProperties = get(this, 'sortProperties');
    var sortAscending = get(this, 'sortAscending');
    var sortFunction = get(this, 'sortFunction');

    Ember.assert('you need to define `sortProperties`', !!sortProperties);

    sortProperties.forEach((propertyName) => {
      if (result === 0) {
        result = sortFunction.call(this, get(item1, propertyName), get(item2, propertyName));
        if ((result !== 0) && !sortAscending) {
          result = (-1) * result;
        }
      }
    });

    return result;
  },

  destroy() {
    var content = get(this, 'content');
    var sortProperties = get(this, 'sortProperties');

    if (content && sortProperties) {
      content.forEach((item) => {
        sortProperties.forEach((sortProperty) => {
          removeObserver(item, sortProperty, this, 'contentItemSortPropertyDidChange');
        });
      });
    }

    return this._super(...arguments);
  },

  isSorted: notEmpty('sortProperties'),

  /**
    Overrides the default `arrangedContent` from `ArrayProxy` in order to sort by `sortFunction`.
    Also sets up observers for each `sortProperty` on each item in the content Array.
    @property arrangedContent
    @private
  */
  arrangedContent: computed('content', 'sortProperties.[]', {
    get() {
      var content = get(this, 'content');
      var isSorted = get(this, 'isSorted');
      var sortProperties = get(this, 'sortProperties');

      if (content && isSorted) {
        content = content.slice();
        content.sort((item1, item2) => this.orderBy(item1, item2));

        content.forEach((item) => {
          sortProperties.forEach((sortProperty) => {
            addObserver(item, sortProperty, this, 'contentItemSortPropertyDidChange');
          });
        });

        return Ember.A(content);
      }

      return content;
    }
  }),

  _contentWillChange: beforeObserver('content', function() {
    var content = get(this, 'content');
    var sortProperties = get(this, 'sortProperties');

    if (content && sortProperties) {
      content.forEach((item) => {
        sortProperties.forEach((sortProperty) => {
          removeObserver(item, sortProperty, this, 'contentItemSortPropertyDidChange');
        });
      });
    }

    this._super(...arguments);
  }),

  sortPropertiesWillChange: beforeObserver('sortProperties', function() {
    this._lastSortAscending = undefined;
  }),

  sortPropertiesDidChange: observer('sortProperties', function() {
    this._lastSortAscending = undefined;
  }),

  sortAscendingWillChange: beforeObserver('sortAscending', function() {
    this._lastSortAscending = get(this, 'sortAscending');
  }),

  sortAscendingDidChange: observer('sortAscending', function() {
    if (this._lastSortAscending !== undefined && get(this, 'sortAscending') !== this._lastSortAscending) {
      var arrangedContent = get(this, 'arrangedContent');
      arrangedContent.reverseObjects();
    }
  }),

  contentArrayWillChange(array, idx, removedCount, addedCount) {
    var isSorted = get(this, 'isSorted');

    if (isSorted) {
      var arrangedContent = get(this, 'arrangedContent');
      var removedObjects = array.slice(idx, idx+removedCount);
      var sortProperties = get(this, 'sortProperties');

      removedObjects.forEach((item) => {
        arrangedContent.removeObject(item);

        sortProperties.forEach((sortProperty) => {
          removeObserver(item, sortProperty, this, 'contentItemSortPropertyDidChange');
        }, this);
      }, this);
    }

    return this._super(array, idx, removedCount, addedCount);
  },

  contentArrayDidChange(array, idx, removedCount, addedCount) {
    var isSorted = get(this, 'isSorted');
    var sortProperties = get(this, 'sortProperties');

    if (isSorted) {
      var addedObjects = array.slice(idx, idx+addedCount);

      addedObjects.forEach((item) => {
        this.insertItemSorted(item);

        sortProperties.forEach((sortProperty) => {
          addObserver(item, sortProperty, this, 'contentItemSortPropertyDidChange');
        });
      });
    }

    return this._super(array, idx, removedCount, addedCount);
  },

  insertItemSorted(item) {
    var arrangedContent = get(this, 'arrangedContent');
    var length = get(arrangedContent, 'length');

    var idx = this._binarySearch(item, 0, length);
    arrangedContent.insertAt(idx, item);
  },

  contentItemSortPropertyDidChange(item) {
    var arrangedContent = get(this, 'arrangedContent');
    var oldIndex = arrangedContent.indexOf(item);
    var leftItem = arrangedContent.objectAt(oldIndex - 1);
    var rightItem = arrangedContent.objectAt(oldIndex + 1);
    var leftResult = leftItem && this.orderBy(item, leftItem);
    var rightResult = rightItem && this.orderBy(item, rightItem);

    if (leftResult < 0 || rightResult > 0) {
      arrangedContent.removeObject(item);
      this.insertItemSorted(item);
    }
  },

  _binarySearch(item, low, high) {
    var mid, midItem, res, arrangedContent;

    if (low === high) {
      return low;
    }

    arrangedContent = get(this, 'arrangedContent');

    mid = low + Math.floor((high - low) / 2);
    midItem = arrangedContent.objectAt(mid);

    res = this.orderBy(midItem, item);

    if (res < 0) {
      return this._binarySearch(item, mid+1, high);
    } else if (res > 0) {
      return this._binarySearch(item, low, mid);
    }

    return mid;
  }

});

var SortableArray = Em.ArrayProxy.extend(SortableMixin);

exports.Array = Em.Mixin.create({

  sortedModel: Em.computed('model.[]', 'sortProperties.[]', 'sortAscending', function() {
    return SortableArray.create({
      sortProperties: this.get('sortProperties'),
      sortAscending: this.get('sortAscending'),
      content: this.get('model'),
    });
  }),

});

function beforeObserver(...args) {
  var func  = args.slice(-1)[0];
  var paths;

  var addWatchedProperty = function(path) { paths.push(path); };

  var _paths = args.slice(0, -1);

  if (typeof func !== 'function') {
    // revert to old, soft-deprecated argument ordering

    func  = args[0];
    _paths = args.slice(1);
  }

  paths = [];

  for (var i = 0; i < _paths.length; ++i) {
    Ember.expandProperties(_paths[i], addWatchedProperty);
  }

  if (typeof func !== 'function') {
    throw new Ember.Error('Ember.beforeObserver called without a function');
  }

  func.__ember_observesBefore__ = paths;
  return func;
}

