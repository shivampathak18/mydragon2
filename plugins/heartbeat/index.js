var Basic = require('hapi-auth-jwt'),
  scAuth = require('../auth-plugins/sc-auth'),
  routes = require("./routes.js");

exports.register = function (server, options, next) {
  server.expose({ Config: options.Config });
  // server.auth.strategy('token',
  //   'jwt',
  //   { validateFunc: scAuth.tokenValidate,
  //     key: options.Config.keys.privateKey });
  server.route(routes);
  next();
};


exports.register.attributes = {
  pkg: require('./package.json')
};
