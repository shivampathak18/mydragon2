// This is a file generated by the yeoman generator hapijs

/**
 * Dao layer which actually gets file from the datastore
 *
 * @type {exports}
 */
var Boom = require('boom');
var Mongoose = require('mongoose');

var scrollSchema = new Mongoose.Schema({
  userScrollId: String,
  metaScrollId : String,
  dataScrollId: String,
  methodHandler : String,
  routeHandler: String,
  handlerDesc: String,
  exec: String,
  endpoint: String

});

module.exports = Mongoose.model('Scroll', scrollSchema, 'scroll')