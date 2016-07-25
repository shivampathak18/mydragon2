/**
 * All the endpoints for anything related to browse
 *
 * @type {exports}
 */
var Joi = require('joi'),
  browseController = require('./browse-ctrl');

module.exports = function() {
  return [
    {
      method: 'GET',
      path: '/browse/{path*}',
      config: {
        description: 'Let\'s you browse datasets by source. '+
        'Example: GET /browse/source/in/gov/nuepa',
        handler: browseController.browseBySource,
        validate: {
          query: {
            category: Joi.array().items(Joi.string()),
            filter_query: Joi.string(),
            scroll_id: Joi.string(),
            size: Joi.number(),
            from: Joi.number()
          }
        }
      }
    },
    {
      method: 'GET',
      path: '/browse/category',
      config: {
        description: 'Let\'s you browse data by category.' +
        'Example: GET /browse/source?category=education+government spending',
        handler: browseController.browseByCategory,
        validate: {
          query: {
            categories: Joi.string()
          }
        }
      }
    },
    {
      method: 'GET',
      path: '/path/count/{path*}',
      config: {
        description: 'Returns the number of datasets under a path.',
        handler: browseController.getPathCount
      }
    },
    {
      method: 'GET',
      path: '/categories',
      config: {
        description: 'Returns all the categories present with the number '+
        'of documents under each.',
        handler: browseController.getAllCategories
      }
    },
    {
      method: 'GET',
      path: '/path/mcount',
      config: {
        description: 'Returns the number of datasets under each path.',
        handler: browseController.getMultiPathCount,
        validate: {
          query: {
            paths: Joi.array().items(Joi.string())
          }
        }
      }
    }
  ];
}();
