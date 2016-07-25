// This is a file generated by the yeoman generator hapijs

/**
 * All the endpoints for anything related to dise
 *
 * @type {exports}
 */
var Joi = require('joi');
var diseController = require('./dise-ctrl');
var Path = require('path');

module.exports = function() {
  return [
    {
      method: 'GET',
      path: '/dise/search/{query}',
      config: {
        description: 'Searches through dise',
        handler: diseController.searchDise,
        validate: {
          // query: {
          //   size: Joi.number(),
          //   from: Joi.number(),
          //   state_code: Joi.string().length(2),
          //   _ : Joi.number()
          // }
        }
      }
    },

    {
      method: 'GET',
      path: '/dise/metadata',
      handler: function (request, reply) {
          reply.file(Path.join(__dirname, 'public/metadata.json'));
      }
    }

  ]
}();
