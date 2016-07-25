var Joi = require('joi');
var collectionController = require('./collection-ctrl');

var routes = [
  {
    path: '/collections',
    method: 'GET',
    handler: collectionController.getCollections,
    config: {
      validate: {
        query: {
          author: Joi.string()
        }
      }
    }
  },
  {
    path: '/collections/{id}',
    method: 'GET',
    handler: collectionController.getCollectionWithId,
    config: {
      validate: {
        query: {
          author: Joi.string()
        }
      }
    }
  },
  {
    path: '/collections',
    method: 'POST',
    handler: collectionController.createCollection,
    config: {
      validate: {
        payload: {
          title: Joi.string().required(),
          description: Joi.string(),
          author: Joi.string().required(),
          tags: Joi.array(Joi.string()),
          meta_ids: Joi.array(Joi.string()).required()
        }
      }
    }
  },
  {
    path: '/collections/add',
    method: 'POST',
    handler: collectionController.addToCollection,
    config: {
      validate: {
        payload: {
          cid: Joi.string().required(),
          meta_id: Joi.string().required()
        }
      }
    }
  },
  {
    // TODO Must be authorized.
    path: '/collections',
    method: 'DELETE',
    handler: collectionController.deleteCollection,
    config: {
      validate: {
        payload: {
          cid: Joi.string().required()
        }
      }
    }
  },
  {
    path: '/collections/search/{query}',
    method: 'GET',
    handler: collectionController.searchCollections,
    config: {
      validate: {
        params: {
          query: Joi.string()
        }
      }
    }
  },
  {
    path: '/collections/contain/{path*}',
    method: 'GET',
    handler: collectionController.getCollectionsContainingPath,
    config: {
      validate: {
        params: {
          path: Joi.string()
        }
      }
    }
  },

  {
    path: '/featured_collections/{slug}',
    method: 'GET',
    handler: collectionController.getFeaturedCollectionWithSlug,
    config: {
      validate: {
        params: {
          slug: Joi.string().required()
        }
      }
    }
  },


]

module.exports = routes
