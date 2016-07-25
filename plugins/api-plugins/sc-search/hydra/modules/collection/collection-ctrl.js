// This is a file generated by the yeoman generator hapijs

/**
 * Controller which handles requests/responses relating to sc-search
 *
 * @type {sc-searchDao|exports}
 */

var CollectionLib = require('./collection-lib'),
	CollectionDao = require('./collection-dao');

var _this = this;

/**
* Creates a collection of datasets
*
* @param req
* @param reply
*/
exports.createCollection = function (request, reply) {

	CollectionDao.User.findByEmail(request.payload.author, function (err, user) {
		if (user !== null) {
			CollectionLib.createCollection(request.payload)
			.then(function(response) {
			  reply(response);
			}).catch(function(response) {
				reply(response);
			});
		} else {
			reply('User not found').status(404);
		}
	});
};

/**
* Creates a collection of datasets
*
* @param req
* @param reply
*/
exports.getCollectionWithId = function(request, reply) {
	var author = request.query.author;
	var id = request.params.id;
	CollectionLib.getCollectionWithId(id, author)
	.then(function(response) {
		reply(response);
	})
	.catch(function(response) {
		console.log(arguments);
		reply(response);
	});
};

/**
* Adds a dataset to a collection
*
* @param req
* @param reply
*/
exports.addToCollection = function (request, reply) {
	CollectionLib.addToCollection(request.payload)
	.then(function(response) {
		reply(response);
	})
	.catch(function(response) {
		reply(response);
	});
}

/**
* Deletes a collection
*
* @param req
* @param reply
*/
exports.deleteCollection = function (request, reply) {

	CollectionLib.deleteCollection(request.payload.cid)
	.then(function(response) {
		reply(response);
	}).catch(function(response) {
		reply(response);
	});
}

/**
* Get all collections authored by a user
*
* @param req
* @param reply
*/
exports.getCollections = function (request, reply) {

	CollectionLib.getCollections(request.query.author)
	.then(function (response) {
		reply(response);
	})
	.catch(function (response) {
		reply(response);
	});
}

/**
* Search all collections
*
* @param req
* @param reply
*/
exports.searchCollections = function (request, reply) {

	CollectionLib.searchCollections(request.params.query)
	.then(function (response) {
		reply(response);
	})
	.catch(function (response) {
		reply(response);
	});
}

/**
* Get all collections that contain the path
*
* @param req
* @param reply
*/
exports.getCollectionsContainingPath = function (request, reply) {

	CollectionLib.getCollectionsContainingPath(request.params.path)
	.then(function (response) {
		reply(response);
	})
	.catch(function (response) {
		reply(response);
	});
}


exports.getFeaturedCollectionWithSlug = function(request, reply) {
	var slug = request.params.slug;
	CollectionLib.getFeaturedCollectionWithSlug(slug)
	.then(function(response) {
		reply(response);
	})
	.catch(function(response) {
		console.log(arguments);
		reply(response);
	});
};
