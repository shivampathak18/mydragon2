// This is a file generated by the yeoman generator hapijs

/**
 * All the endpoints for anything related to history
 *
 * @type {exports}
 */
var Joi = require('joi');
var historyController = require('./history-ctrl');

module.exports = function() {
  return [
    {
      method: 'GET',
      path: '/history',
      config : {
        description: 'Fetches all history',
        handler: historyController.find
        validate: {
          payload: {
            
          }
        }
      }

    }
  ]
}();
