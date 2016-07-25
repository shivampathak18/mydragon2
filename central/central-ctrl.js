// This is a file generated by the yeoman generator hapijs

/**
 * Controller which handles requests/responses relating to auth
 *
 * @type {authDao|exports}
 */
var apictrl = require('../plugins/api-plugins/api-ctrl');
	

/**
 * Gets all auths
 *
 * @param req
 * @param reply
 */
exports.controller = function (request, reply) {
	/*authDao.find(function (err, data) {
		if (err) {
			return reply(Boom.wrap(err));
		}
		reply(data);
	});
*/
	var apiCalled = request.path;
	//console.log(apiCalled);
	apiCalled = apiCalled.split('/')[1];
	console.log(apiCalled);
	console.log(request.payload.query);

	apictrl.controller(apiCalled,request,reply);
	//apictrl.controller(request.params,reply);
};