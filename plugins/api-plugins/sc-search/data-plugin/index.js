var dataRoutes = require("./modules/data/data-routes"),
Mongoose = require("mongoose"),
Basic = require('hapi-auth-basic'),
scAuth = require('../../../auth-plugins/sc-auth');

//global.events = require('events');
//global.eventEmitter = new events.EventEmitter();

exports.register = function (server, options, next) {
  server.expose({ Config: options.Config });
  //server.expose("esclient",options.esclient)
  server.route(dataRoutes);
  next();
};


exports.register.attributes = {
  pkg: require('./package.json')
};
