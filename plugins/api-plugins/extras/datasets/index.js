var diseRoutes = require("./modules/dise/dise-routes");

exports.register = function (server, options, next) {
  server.expose({ Config: options.Config });
  // //server.expose("esclient",options.esclient)
  // server.auth.strategy('simple',
  // 'basic',
  // { validateFunc: scAuth.simpleValidate });
  server.route(diseRoutes);
  next();
};


exports.register.attributes = {
  pkg: require('./package.json')
};
