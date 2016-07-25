var ejs = require('elastic.js'),
  _ = require('underscore'),
  Q = require('q'),
  CollectionDao = require('./collection-dao'),
  client = require('../../../../../../config/esclient');

// Helpers
function createCollectionInDatabase (collectionItem) {
  var dfd = Q.defer();

  CollectionDao.UserCollection.createCollection(collectionItem, function (err, model) {
    if (err !== null) {
      dfd.reject({error: error});
    } else {
      dfd.resolve(model);
    }
  });

  return dfd.promise;
};

function addToCollectionInDatabase (cid, meta_id) {
  var dfd = Q.defer();

  CollectionDao.UserCollection.addToCollection(cid, meta_id, function (err, model) {
    if (err !== null) {
      dfd.reject({error: error});
    } else {
      dfd.resolve(model);
    }
  });

  return dfd.promise;
};

function deleteCollectionFromDatabase (cid) {
  var dfd = Q.defer();

  CollectionDao.UserCollection.deleteCollection(cid, function (error, model) {
    if (error !== null) {
      dfd.reject("Deletion from database failed!");
    } else {
      dfd.resolve(model);
    }
  });

  return dfd.promise;
};

function createCollectionSearchResponse (response) {
  var modifiedResponse = _.pluck(response.hits.hits, '_source');
  return modifiedResponse;
};

function isHitsPresent (response) {
  if (response.hits.hits.length === 0) {
    return false;
  } else {
    return true;
  }
};

function processResponses(responses) {
  var finalResponse = [];
  _.each(responses, function(response) {
    var tempResponse = _.pluck(response.hits.hits, '_source');
    finalResponse.push(tempResponse[0]);
  });
  return finalResponse;
};

/**
* Create a collection of a list of metadata
* @return {promise}
*/
exports.createCollection = function (payload) {

  var dfd = Q.defer(),
    queries = [];

  _.each(payload.meta_ids, function (value) {
    var queryObj = ejs.Request()
    .query(
      ejs.FilteredQuery(
        ejs.MatchAllQuery(),
        ejs.TermFilter('path', value)
      )
    )
    .source(['metadata'], ['metadata.columns'])
    .toJSON();
    queries.push({});
    queries.push(queryObj);
  });

  // Get the metadata of all the datasets that are to be added to the collection
  client.msearch({
    index: 'meta',
    body: queries
  }, function (err, response) {
    if (typeof err !== 'undefined') {
      dfd.reject({ error: err });
    } else {
      var responses = _.map(response.responses, function (response) {
        if (_.isEmpty(response.hits.hits)) {
          return [];
        }
        return _.pluck(response.hits.hits, '_source')[0]['metadata'];
      }),
      // User collection schema
      collection_item = {
        title: payload.title,
        description: payload.description,
        author: payload.author,
        tags: payload.tags,
        meta_ids: payload.meta_ids,
        items: responses
      };

      // Index the collection
      client.index({
        index: 'collections',
        type: 'user_collections',
        body: collection_item
      }, function (error, response) {
        if (typeof error !== 'undefined') {
          dfd.reject({ error: error });
        } else {
          delete collection_item.items;
          collection_item.cid = response._id;
          // Add the collection to database
          createCollectionInDatabase(collection_item)
          .then(function() {
            dfd.resolve(response);
          })
          .catch(function() {
            dfd.reject({error: "Adding to database failed."})
          });
        }
      });
    }
  });

  return dfd.promise;
};

/**
* Add a dataset to a collection.
* @param id {string}
* @param author {string}
* @return {promise}
*/
exports.getCollectionWithId = function (id, author) {
  var dfd = Q.defer();
  var finalResponse;
  CollectionDao.UserCollection.findById(id, function(error, response) {
    finalResponse = response[0];
    var meta_ids = response[0].meta_ids;
    var queryObjects = [];
    _.each(meta_ids, function(id) {
      var filter = ejs.TermFilter('path', id);
      var queryObj = ejs.Request()
      .query(
        ejs.FilteredQuery(
          ejs.MatchAllQuery(),
          filter
        )
      )
      .source([], ['columns', '*_suggest'])
      .toJSON();
      queryObjects.push({});
      queryObjects.push(queryObj);
    });
    client.msearch({
      index: 'kraken',
      body: queryObjects
    }, function(error, responses) {
      if (_.isEmpty(error)) {
        var datasets = processResponses(responses.responses);
        var x = {};
        x.collection_metadata = finalResponse;
        x.datasets = datasets;
        dfd.resolve(x);
      } else {
        dfd.reject(error);
      }
    });
  });
  return dfd.promise;
};

/**
* Add a dataset to a collection.
* @return {promise}
*/
exports.addToCollection = function (payload) {
  var dfd = Q.defer(),
    queryObj = ejs.Request()
    .query(
      ejs.FilteredQuery(
        ejs.MatchAllQuery(),
        ejs.TermFilter('path', payload.meta_id)
      )
    )
    .source(['metadata'], ['metadata.columns'])
    .toJSON();
  // Fetch the metadata of the dataset that is to be added to the collection
  client.search({
    index: 'kraken',
    body: queryObj
  }, function (error, response) {
    if (typeof error !== 'undefined') {
      dfd.reject({ error: error });
    } else {
      if (isHitsPresent(response)) {
        var metadata = response.hits.hits[0]['_source']['metadata'],
          updateBody = {
            file: 'append_items',
            lang: 'groovy',
            params: {
              new_item: metadata,
              new_meta_id: payload.meta_id
            }
          };
        // Update the collection. Append the new metadata to items.
        // Append the pointer to the new dataset to the meta_ids array.
        client.update({
          index: 'collections',
          type: 'user_collections',
          id: payload.cid,
          body: updateBody
        }, function (error, response) {
          if (typeof error !== 'undefined') {
            console.log(error);
            dfd.reject({ error: error });
          } else {
            // Modify the collection in the database
            addToCollectionInDatabase(response._id, payload.meta_id)
            .then(function() {
              dfd.resolve(response);
            })
            .catch(function() {
              dfd.reject({error: 'Updating changes into database failed!'});
            })
          }
        });
      } else {
        dfd.reject({error: "Hits weren't present. There was probabbly something wrong with the query"});
      }
    }
  });

  return dfd.promise;
}

/**
* Get all collections created by user
* @param author
* @return {promise}
*/
exports.getCollections = function (author) {
  var dfd = Q.defer();

  CollectionDao.UserCollection.findByAuthor(author, function (err, models) {
    if (err !== null) {
      dfd.reject({error: err});
    } else {
      dfd.resolve(models);
    }
  });

  return dfd.promise;
}

/**
* Search through all collections
* @param query
* @return {promise}
*/
exports.searchCollections = function (query) {
  var dfd = Q.defer(),
  queryObj = ejs.Request()
  .query(
    ejs.QueryStringQuery(query)
  )
  .toJSON();

  client.search({
    index: 'collections',
    body: queryObj
  }, function (error, response) {
    if (typeof error !== 'undefined') {
      dfd.reject({ error: error });
    } else {
      var modifiedResponse = createCollectionSearchResponse(response);
      dfd.resolve(modifiedResponse);
    }
  });

  return dfd.promise;
}

/**
* Delete collection
* @param query
* @return {promise}
*/
exports.deleteCollection = function (cid) {
  var dfd = Q.defer();

  client.delete({
    index: 'collections',
    type: 'user_collections',
    id: cid
  }, function (error, response) {
    if (typeof error !== 'undefined') {
      dfd.reject({error: error});
    } else {
      deleteCollectionFromDatabase(cid)
      .then(function (model) {
        dfd.resolve(model);
      })
      .catch(function (error) {
        dfd.reject(error);
      });
    }
  });

  return dfd.promise;
}


exports.getCollectionsContainingPath = function (path) {
  var dfd = Q.defer(),
  queryObj = ejs.Request()
  .query(
    ejs.FilteredQuery(
      ejs.MatchAllQuery(),
      ejs.TermFilter('meta_ids', '/'+path)
    )
  )
  .toJSON();

  console.log(JSON.stringify(queryObj));

  client.search({
    index: 'collections',
    body: queryObj,
  }, function (error, response) {
    if (typeof error !== 'undefined') {
      dfd.reject({error: error});
    } else {
      dfd.resolve(response);
    }
  });

  return dfd.promise;
}


exports.getFeaturedCollectionWithSlug = function (slug) {
  var dfd = Q.defer();
  var finalResponse;
  CollectionDao.FeaturedCollection.findBySlug(slug, function(error, response) {
      if (_.isEmpty(error)) {
        dfd.resolve(response);
      } else {
        dfd.reject(error);
      }
  });
  return dfd.promise;
};