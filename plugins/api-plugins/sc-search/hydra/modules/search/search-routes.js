var Joi = require('joi');
var searchController = require('./search-ctrl');
var Wreck = require('wreck');

var routes = [
  {
    path: '/search/query/{queryString}',
    method: 'GET',
    handler: searchController.search,
    config: {      
      auth: {
        strategies: ['token']
      },
      validate: {
        query: {
          and: Joi.array().items(Joi.string()),
          or: Joi.array().items(Joi.string()),
          size: Joi.number(),
          from: Joi.number(),
          asof_range: Joi.array().items(Joi.string()).length(2),
          frequency: Joi.string(),
          region_level: Joi.string(),
          source_type: Joi.string(),
          parent_path: Joi.string(),
          leaf_path: Joi.string(),
          filterTags: Joi.array().items(Joi.string()),
        }
      }
    }
  },
  {
    path: '/search/suggest/{queryString}',
    method: 'GET',
    handler: searchController.searchSuggest,
    config: {      
      auth: {
        strategies: ['token']
      },
      validate: {
        query: {
          and: Joi.array().items(Joi.string()),
          or: Joi.array().items(Joi.string()),
          size: Joi.number(),
          from: Joi.number(),
          asof_range: Joi.array().items(Joi.string()).length(2),
          frequency: Joi.string(),
          region_level: Joi.string(),
          source_type: Joi.string(),
          agg: Joi.boolean().default(false)
        }
      }
    }
  },
  {
    path: '/search/tagsuggest/{queryString}/{inputString}',
    method: 'GET',
    handler: searchController.tagsSuggest,
    config: {
      
      auth: {
        strategies: ['token']
      },
      validate: {
        query: {
          and: Joi.array().items(Joi.string()),
          or: Joi.array().items(Joi.string()),
          size: Joi.number(),
          from: Joi.number(),
          asof_range: Joi.array().items(Joi.string()).length(2),
          frequency: Joi.string(),
          region_level: Joi.string(),
          source_type: Joi.string(),
          agg: Joi.boolean().default(false)
        }
      }
    }
  },
  {
    path: '/search/query/fe/{queryString}',
    method: 'GET',
    handler: searchController.searchForExcelPlugin,
    config: {
      auth: {
        strategies: ['token']
      },
      validate: {
        query: {
          and: Joi.array().items(Joi.string()),
          or: Joi.array().items(Joi.string()),
          size: Joi.number(),
          from: Joi.number(),
          asof_range: Joi.array().items(Joi.string()).length(2),
          frequency: Joi.string(),
          region_level: Joi.string(),
          source_type: Joi.string(),
          parent_path: Joi.string(),
          leaf_path: Joi.string()
        }
      }
    }
  }  

];

module.exports = routes;
