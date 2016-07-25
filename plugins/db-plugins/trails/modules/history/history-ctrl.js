// This is a file generated by the yeoman generator hapijs

/**
 * Controller which handles requests/responses relating to history
 *
 * @type {historyDao|exports}
 */
var history = require('./history-dao');
var Boom = require('boom');
var Hoek = require('hoek');
var _ = require('underscore');

/**
 * Creates a history
 *
 * @param req
 * @param reply
 */
exports.create = function (req, reply) {

  // Save request.properties to db
  // http://hapijs.com/api#request-properties
  var source = _.omit(req.response.source,
                      ['_readableState', '_events'])
  

  var record = new history({
    app : req.app,
    payload : req.payload,
    query : req.query,
    url : req.url,
    auth : req.auth,
    info : req.info,
    headers : req.headers,
    method : req.method,
    mime : req.mime,
    orig : req.orig,
    params : req.params,
    paramsArray : req.paramsArray,
    path : req.path,
    payload : req.payload,
    query : req.query,
    state : req.state,
    _logger: req._logger,
    response : {
      source: source,
      headers: req.response.headers,
      statusCode: req.response.statusCode,
      variety: req.response.variety
    }
  })

  record.save(function(err){
    if(err){
      console.log(err)
    }
  })
};

/**
 * Gets all histories
 *
 * @param req
 * @param reply
 */
exports.find = function (req, reply) {

};

/**
 * Get a specific history by id
 *
 * @param req
 * @param reply
 */
exports.findById = function (req, reply) {

};

/**
 * Update a specific history by id
 *
 * @param req
 * @param reply
 */
exports.update = function (req, reply) {

};
    
/**
 * Remove a specific history by id
 *
 * @param req
 * @param reply
 */
exports.remove = function (req, reply) {

};

/* Add new methods above */