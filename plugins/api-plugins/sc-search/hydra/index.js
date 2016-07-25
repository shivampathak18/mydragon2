var searchRoutes = require("./modules/search/search-routes"),
browseRoutes = require("./modules/browse/browse-routes"),
collectionRoutes = require("./modules/collection/collection-routes"),
Mongoose = require("mongoose"),
Basic = require('hapi-auth-basic'),
scAuth = require('../../../auth-plugins/sc-auth');

//global.events = require('events');
//global.eventEmitter = new events.EventEmitter();

exports.register = function (server, options, next) {
  server.expose({ Config: options.Config });
  //server.expose("esclient",options.esclient)
  server.route(searchRoutes);
  server.route(browseRoutes);
  server.route(collectionRoutes);
  next();
};


exports.register.attributes = {
    pkg: require('./package.json')
};
