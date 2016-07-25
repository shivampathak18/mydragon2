// This is a file generated by the yeoman generator hapijs

/**
 * Controller which handles requests/responses relating to upload
 *
 * @type {uploadDao|exports}
 */
var uploadDao = require('./upload-dao');
var Boom = require('boom');

/**
 * Creates a upload
 *
 * @param req
 * @param reply
 */
exports.create = function (req, reply) {

	uploadDao.create(req.payload, function (err, data) {
		if (err) {
			return reply(Boom.wrap(err));
		}
		reply(data);
	});
};

/**
 * Gets all uploads
 *
 * @param req
 * @param reply
 */
exports.find = function (req, reply) {

	uploadDao.find(function (err, data) {
		if (err) {
			return reply(Boom.wrap(err));
		}
		reply(data);
	});
};

/**
 * Get a specific upload by id
 *
 * @param req
 * @param reply
 */
exports.findById = function (req, reply) {

	uploadDao.findById(req.params.id, function (err, data) {
		if (err) {
			return reply(Boom.wrap(err));
		}
		reply(data);
	});
};

/**
 * Update a specific upload by id
 *
 * @param req
 * @param reply
 */
exports.update = function (req, reply) {

	uploadDao.update(req.params.id, req.payload, function (err, data) {
		if (err) {
			return reply(Boom.wrap(err));
		}
		reply(data);
	});
};
		
/**
 * Remove a specific upload by id
 *
 * @param req
 * @param reply
 */
exports.remove = function (req, reply) {

	uploadDao.remove(req.params.id, function (err, data) {
		if (err) {
			return reply(Boom.wrap(err));
		}
		reply(data);
	});
};

/* Add new methods above */
