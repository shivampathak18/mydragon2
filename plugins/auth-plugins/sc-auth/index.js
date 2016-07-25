var authLib = require('./modules/auths/auth-lib.js'),
	routes = require('./modules/auths/auth-routes.js');

var simpleValidate = function simpleValidate(username, password, callback) {
	authLib.simpleValidate(username, password, callback);
}

var tokenValidate = function tokenValidate(decodedToken, callback) {
	authLib.tokenValidate(decodedToken, callback);
};

exports.register = function (server, options, next) {
	server.expose({ Config: options.Config });
	server.auth.strategy('simple',
	'basic',
	{ validateFunc: simpleValidate });
	server.auth.strategy('token',
	'jwt',
	{ validateFunc: tokenValidate,
		key: options.Config.keys.privateKey });
  server.route(routes);
  next();
};


exports.register.attributes = {
  pkg: require('./package.json')
};
