/**
 * Controller which handles requests/responses relating to browse
 *
 *
 * @type {browseDao|exports}
 */
var browseDao = require('./browse-dao'),
  BrowseLib = require('./browse-lib'),
  Boom = require('boom');

/**
* Browse the datasets by source.
*
* @param req
* @param reply
*/
exports.browseBySource = function (req, reply) {

  BrowseLib.browseBySource(req.params.path, req.query)
  .then(function(response) {
    reply(response);
  })
  .catch(function(response) {
    reply(response).status(418);
  });
};

/**
* Browse the datasets by category.
*
* @param req
* @param reply
*/
exports.browseByCategory = function (req, reply) {

  BrowseLib.browseByCategory(JSON.parse(req.query.categories), req.query)
  .then(function(response) {
    reply(response);
  })
  .catch(function(response) {
    reply(response).status(418);
  });
};

/**
* Get the number of documents under a path.
*
* @param req
* @param reply
*/
exports.getPathCount = function (req, reply) {

  BrowseLib.getPathCount(req.params.path)
  .then(function (response) {
    reply(response);
  })
  .catch(function (response) {
    reply(response).status(418);
  });
}

/**
* Returns all the categories present with the number of documents under each.
*
* @param req
* @param reply
*/
exports.getAllCategories = function (req, reply) {
  BrowseLib.getAllCategories()
  .then(function (response) {
    reply(response);
  })
  .catch(function (response) {
    reply(response).status(418);
  });
}

/**
* Get the number of documents under each path.
*
* @param req
* @param reply
*/
exports.getMultiPathCount = function (req, reply) {

  BrowseLib.getMultiPathCount(req.query.paths)
  .then(function (response) {
    reply(response);
  })
  .catch(function (response) {
    reply(response).status(418);
  });
}
