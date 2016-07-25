var routes = require('./modules/uploads/upload-routes.js')

exports.register = function (server, options, next) {
  server.expose('base_url', options['base_url'])
  server.route(routes)
  next();
};


exports.register.attributes = {
  pkg: require('./package.json')
};
