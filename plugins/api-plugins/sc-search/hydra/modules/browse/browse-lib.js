var ejs = require('elastic.js'),
  _ = require('underscore'),
  Q = require('q'),
  client = require('../../../../../../config/esclient');


// Helpers
function _pathCreator (path) {

  var newPath;
  if (typeof path === 'undefined') {
    newPath = '/sc';
  } else {
    newPath = '/' + path;
  }
  return newPath;
}

function _startSearch (queryObj) {

  var dfd = Q.defer();

  client.search({
    index: 'meta',
    scroll: '30s',
    body: queryObj
  }, function (error, response) {
    if (typeof error !== 'undefined') {
      console.log(error);
      dfd.reject({ error: error });
    } else {
      dfd.resolve(response);
    }
  });

  return dfd.promise;
}

// Response creating functions. These should go wherever scroll decides to put them.
function createPathCountResponse (path, response) {

  var count = {};
  count[path] = response.hits.total;
  return count;
}

function createBrowseResponse (response, options) {

  var scroll_id = response.responses[1]._scroll_id,
    newResponse = _.pluck(response.responses[0].hits.hits, '_source')[0];
  if (typeof newResponse === 'undefined') {
    newResponse = {};
  }
  newResponse.scroll_id = scroll_id;
  newResponse.datasets = _.pluck(response.responses[1].hits.hits, '_source');
  if (typeof newResponse.datasets === 'undefined') {
    newResponse.datasets = [];
  }
  return newResponse;
}

/**
* Constructs the ES query for browsing by category.
*
* @param {string[]} categories - Categories
* @param {Object} options - Options used for the query
* @return {promise}
*/
exports.browseByCategory = function (categories, options) {

  var dfd = Q.defer(),
    categoryFilter,
    categoryFilters = [],
    queryObj;

  _.each(categories, function (category) {
    categoryFilter = ejs.TermFilter('metadata.category.raw', category);
    categoryFilters.push(categoryFilter);
  });
  queryObj = ejs.Request()
  .query(
    ejs.FilteredQuery(
      ejs.MatchAllQuery(),
      ejs.AndFilter(categoryFilters)
    )
  )
  .agg(
    ejs.TermsAggregation('sub_category')
      .field('metadata.category.raw')
  )
  .toJSON();

  client.search({
    index: ['meta'],
    type: 'leaf',
    body: queryObj
  }, function (error, response) {
    if (typeof error !== 'undefined') {
      dfd.reject({ error: error });
    } else {
      dfd.resolve({ buckets: response.aggregations.sub_category.buckets });
    }
  });

  return dfd.promise;
}

/**
* Constructs the ES query and calls the elasticsearch server.
*
* @param {string} path - Path to the node
* @param {Object} options - Options used for the query
* @return {promise}
*/
exports.browseBySource = function (path, options) {

  path = _pathCreator(path);

  var dfd = Q.defer(),
    parentTypeFilter = ejs.TermFilter('node_type', 'parent'),
    leafTypeFilter = ejs.TermFilter('node_type', 'leaf'),
    subtreePathFilter = ejs.TermFilter('path.tree', path),
    exactPathFilter = ejs.TermFilter('path', path),
    categoryFilters = [],
    queryFilters = [],
    parentFilters = [],
    leafFilters = [],
    body = [];

  // Add filters to filter by node_type
  parentFilters.push(parentTypeFilter);
  leafFilters.push(leafTypeFilter);
  // Add path filter to extract node that belong to the path
  parentFilters.push(exactPathFilter);
  leafFilters.push(subtreePathFilter);

  // Add category filters if they exist
  if (typeof options.category !== 'undefined') {
    _.each(options.category, function(value) {
      categoryFilters.push(ejs.TermFilter('metadata.category.raw', value));
    });
  }
  // Add filter query if it exists
  if (typeof options.filter_query !== 'undefined') {
    _.each(options.filter_query.split(' '), function (term) {
      queryFilters.push(ejs.RegexpFilter('_all', term))
    });
  }
  leafFilters.push.apply(leafFilters, categoryFilters);
  leafFilters.push.apply(leafFilters, queryFilters);

  var from = (typeof options.from === 'undefined'? 1: options.from),
    size = (typeof options.size === 'undefined'? 10: options.size),
    // Create parent query object
    parentQueryObj = ejs.Request()
    .query(
      ejs.FilteredQuery(
        ejs.MatchAllQuery(),
        ejs.AndFilter(parentFilters)
      )
    )
    .toJSON(),
    // Create leaf query object
    leafQueryObj = ejs.Request()
    .query(
      ejs.FilteredQuery(
        ejs.MatchAllQuery(),
        ejs.AndFilter(leafFilters)
      )
    )
    .from(from)
    .size(size)
    .source([], ['metadata.columns'])
    .toJSON();

    // Query parent and leaf types
    Q.allSettled([_startSearch(parentQueryObj), _startSearch(leafQueryObj)])
    .spread(function (parentResponse, leafResponse) {
      var responseObj = {
        responses: []
      };
      responseObj.responses.push(parentResponse.value);
      responseObj.responses.push(leafResponse.value);

      // dfd.resolve(responseObj);
      dfd.resolve(createBrowseResponse(responseObj));
    }).done();

  return dfd.promise;
}

/**
* Get the number of documents under a path.
*
* @param {string} path - Path to the node
* @return {promise}
*/
exports.getPathCount = function (path) {

  // TODO Use path creator everywhere
  var dfd = Q.defer(),
    pathFilter = ejs.TermFilter('path.tree', '/sc/' + path),
    queryObj = ejs.Request()
    .query(
      ejs.FilteredQuery(
        ejs.MatchAllQuery(),
        pathFilter
      )
    )
    .toJSON();

  client.search({
    index: ['meta'],
    type: 'leaf',
    body: queryObj
  }, function (error, response) {
    if (typeof error !== 'undefined') {
      dfd.reject({ error : error });
    } else {
      dfd.resolve(createPathCountResponse('/sc/' + path, response));
    }
  });

  return dfd.promise;
}

/**
* Get the number of documents under each path.
*
* @param {string} path - Path to the node
* @return {promise}
*/
exports.getMultiPathCount = function (paths) {

  var dfd = Q.defer(),
    pathFilter,
    queryObj,
    body = [],
    counts = [];

  _.each(paths, function (path) {
    pathFilter = ejs.TermFilter('path.tree', '/sc/' + path);
    queryObj = ejs.Request()
    .query(
      ejs.FilteredQuery(
        ejs.MatchAllQuery(),
        pathFilter
      )
    )
    .toJSON();
    body.push({});
    body.push(queryObj);
  });

  client.msearch({
    index: ['meta'],
    type: 'leaf',
    body: body
  }, function (error, responses) {
    if (typeof error !== 'undefined') {
      dfd.reject({ error : error });
    } else {
      _.each(responses.responses, function (response, ix) {
        counts.push(createPathCountResponse('/sc/' + paths[ix], response));
      });
      dfd.resolve(counts);
    }
  });

  return dfd.promise;
}

/**
* Gets all the categories present with their counts
* @return {promise}
*/
exports.getAllCategories = function () {
  var dfd = Q.defer(),
    queryObj = ejs.Request()
    .agg(
      ejs.TermsAggregation('categorywise_group')
        .field('metadata.category.raw')
    )
    .toJSON();

  client.search({
    index: ['meta'],
    type: 'leaf',
    body: queryObj
  }, function (error, response) {
    if (typeof error !== 'undefined') {
      dfd.reject({ error: error });
    } else {
      dfd.resolve({ buckets: response.aggregations.categorywise_group.buckets });
    }
  });

  return dfd.promise;
}
// var ejs = require('elastic.js'),
// _ = require('underscore'),
// Q = require('q'),
// client = require('../../../../../../config/esclient');
//
//
// // Helpers
// var browseLib = this;
//
// function _pathCreator (path) {
//
//   var newPath;
//   if (typeof path === 'undefined') {
//     newPath = '/sc';
//   } else if (path[0] === '/') {
//     newPath = path;
//   } else {
//     newPath = '/' + path;
//   }
//   return newPath;
// }
//
// function _addCountsToChildren (response, counts) {
//
//   response.children = _.filter(response.children, function (child) {
//     child.count = counts[child.path];
//     return child;
//   });
//   return response;
// }
//
// // Response creating functions. These should go wherever scroll decides to put them.
// function createPathCountResponse (path, response) {
//
//   var count = {};
//   count[path] = response.hits.total;
//   return count;
// }
//
// function createBrowseResponse (response, options) {
//
//   var newResponse = _.pluck(response.responses[0].hits.hits, '_source')[0];
//   if (typeof newResponse === 'undefined') {
//     newResponse = {};
//   }
//   newResponse.datasets = _.pluck(response.responses[1].hits.hits, '_source');
//   if (typeof newResponse.datasets === 'undefined') {
//     newResponse.datasets = [];
//   }
//   return newResponse;
// }
//
// /**
// * Constructs the ES query for browsing by category.
// *
// * @param {string[]} categories - Categories
// * @param {Object} options - Options used for the query
// * @return {promise}
// */
// exports.browseByCategory = function (categories, options) {
//
//   var dfd = Q.defer(),
//   categoryFilter,
//   categoryFilters = [],
//   queryObj;
//
//   _.each(categories, function (category) {
//     categoryFilter = ejs.TermFilter('metadata.category.raw', category);
//     categoryFilters.push(categoryFilter);
//   });
//   queryObj = ejs.Request()
//   .query(
//     ejs.FilteredQuery(
//       ejs.MatchAllQuery(),
//       ejs.AndFilter(categoryFilters)
//     )
//   )
//   .agg(
//     ejs.TermsAggregation('sub_category')
//     .field('metadata.category.raw')
//   )
//   .toJSON();
//
//   client.search({
//     index: ['meta'],
//     type: 'leaf',
//     body: queryObj
//   }, function (error, response) {
//     if (typeof error !== 'undefined') {
//       dfd.reject({ error: error });
//     } else {
//       dfd.resolve({ buckets: response.aggregations.sub_category.buckets });
//     }
//   });
//
//   return dfd.promise;
// }
//
// /**
// * Constructs the ES query and calls the elasticsearch server.
// *
// * @param {string} path - Path to the node
// * @param {Object} options - Options used for the query
// * @return {promise}
// */
// exports.browseBySource = function (path, options) {
//
//   if (typeof options.category !== 'undefined') {
//     // If a category filter is applied, override some of the options.
//     options.include_subtrees = true;
//     options.leaf = true;
//     options.parent = false;
//   }
//
//   path = _pathCreator(path);
//
//   var dfd = Q.defer(),
//   subtreePathFilter = ejs.TermFilter('path.tree', path),
//   exactPathFilter = ejs.TermFilter('path', path),
//   categoryFilters = [],
//   queryFilters = [],
//   parentFilters = [],
//   leafFilters = [],
//   body = [];
//
//   parentFilters.push(exactPathFilter);
//   leafFilters.push(subtreePathFilter);
//   if (typeof options.category !== 'undefined') {
//     _.each(options.category, function(value) {
//       categoryFilters.push(ejs.TermFilter('metadata.category.raw', value));
//     });
//   }
//   if (typeof options.filter_query !== 'undefined') {
//     _.each(options.filter_query.split(' '), function (term) {
//       queryFilters.push(ejs.RegexpFilter('_all', term))
//     });
//   }
//   leafFilters.push.apply(leafFilters, categoryFilters);
//   leafFilters.push.apply(leafFilters, queryFilters);
//
//   var parentQueryObj = ejs.Request()
//   .query(
//     ejs.FilteredQuery(
//       ejs.MatchAllQuery(),
//       ejs.AndFilter(parentFilters)
//     )
//   )
//   .toJSON(),
//   leafQueryObj = ejs.Request()
//   .query(
//     ejs.FilteredQuery(
//       ejs.MatchAllQuery(),
//       ejs.AndFilter(leafFilters)
//     )
//   )
//   .source([], ['metadata.columns'])
//   .toJSON();
//
//   body.push({ type: 'parent' });
//   body.push(parentQueryObj);
//   body.push({ type: 'leaf' });
//   body.push(leafQueryObj);
//
//   client.msearch({
//     index: 'meta',
//     body: body
//   }, function (error, responses) {
//     if (typeof error !== 'undefined') {
//       dfd.reject({ error: erro });
//     } else {
//       var response = createBrowseResponse(responses, options),
//       childPaths = _.pluck(response.children, 'path');
//       browseLib.getMultiPathCount(childPaths)
//       .then(function (counts) {
//         var newCounts = {};
//         _.each(counts, function (count) {
//           var key = Object.keys(count)[0];
//           newCounts[key] = count[key];
//         });
//         var responseWithCounts = _addCountsToChildren(response, newCounts);
//         // dfd.resolve(responseWithCounts);
//       });
//       dfd.resolve(response);
//     }
//   });
//
//   return dfd.promise;
// }
//
// /**
// * Get the number of documents under a path.
// *
// * @param {string} path - Path to the node
// * @return {promise}
// */
// exports.getPathCount = function (path) {
//
//   // TODO Use path creator everywhere
//   var dfd = Q.defer(),
//   pathFilter = ejs.TermFilter('path.tree', '/sc/' + path),
//   queryObj = ejs.Request()
//   .query(
//     ejs.FilteredQuery(
//       ejs.MatchAllQuery(),
//       pathFilter
//     )
//   )
//   .toJSON();
//
//   client.search({
//     index: ['meta'],
//     type: 'leaf',
//     body: queryObj
//   }, function (error, response) {
//     if (typeof error !== 'undefined') {
//       dfd.reject({ error : error });
//     } else {
//       dfd.resolve(createPathCountResponse('/sc/' + path, response));
//     }
//   });
//
//   return dfd.promise;
// }
//
// /**
// * Get the number of documents under each path.
// *
// * @param {string} path - Path to the node
// * @return {promise}
// */
// exports.getMultiPathCount = function (paths) {
//
//   var dfd = Q.defer(),
//   pathFilter,
//   queryObj,
//   body = [],
//   counts = [];
//
//   _.each(paths, function (path) {
//     path = _pathCreator(path);
//     pathFilter = ejs.TermFilter('path.tree', path);
//     queryObj = ejs.Request()
//     .query(
//       ejs.FilteredQuery(
//         ejs.MatchAllQuery(),
//         pathFilter
//       )
//     )
//     .toJSON();
//     body.push({});
//     body.push(queryObj);
//   });
//
//   client.msearch({
//     index: ['meta'],
//     type: 'leaf',
//     body: body
//   }, function (error, responses) {
//     if (typeof error !== 'undefined') {
//       dfd.reject({ error : error });
//     } else {
//       _.each(responses.responses, function (response, ix) {
//         counts.push(createPathCountResponse(_pathCreator(paths[ix]), response));
//       });
//       dfd.resolve(counts);
//     }
//   });
//
//   return dfd.promise;
// }
//
// /**
// * Gets all the categories present with their counts
// * @return {promise}
// */
// exports.getAllCategories = function () {
//   var dfd = Q.defer(),
//   queryObj = ejs.Request()
//   .agg(
//     ejs.TermsAggregation('categorywise_group')
//     .field('metadata.category.raw')
//   )
//   .toJSON();
//
//   client.search({
//     index: ['meta'],
//     type: 'leaf',
//     body: queryObj
//   }, function (error, response) {
//     if (typeof error !== 'undefined') {
//       dfd.reject({ error: error });
//     } else {
//       dfd.resolve({ buckets: response.aggregations.categorywise_group.buckets });
//     }
//   });
//
//   return dfd.promise;
// }
