var Joi = require('joi');
var scrollController = require('./scroll-ctrl');

var routes = [
  {
    path: '/scroll/{id}',
    method: 'GET',
    handler: scrollController.scroll,
    config: {
      
    }
  }
]

module.exports = routes
