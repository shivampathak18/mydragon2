var Basic = require('hapi-auth-basic'),
  scAuth = require('../plugins/auth-plugins/sc-auth'),
  routes = require("./routes.js");

exports.register = function (server, options, next) {

  server.auth.strategy('simple',
    'basic',
    { validateFunc: scAuth.simpleValidate });
  server.route(routes);
  next();
};


exports.register.attributes = {
  pkg: require('./package.json')
};
