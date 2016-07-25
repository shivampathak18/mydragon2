var history = require("./modules/history/history-ctrl")

exports.register = function (server, options, next) {
  server.expose("history", history)
  server.expose("mongo", options["mongo"])
  next();
};

exports.register.attributes = {
  pkg: require('./package.json')
};