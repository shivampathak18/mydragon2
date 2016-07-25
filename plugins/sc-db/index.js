var Mongoose = require('mongoose');
var elasticsearch = require('elasticsearch');

exports.register = function (server, options, next) {

  // MongoDB Connection
  Mongoose.connect(options['mongo_uri']);
  var mongo = Mongoose.connection;
  mongo.on('error', console.error.bind(console, 'connection error'));
  mongo.once('open', function callback() {
    console.log("Connection with database succeeded.");
  });

  // Expose mongo connection as as 'mongo' in server.plugins['db']
  server.expose("mongo", mongo)  

  //server.expose("esclient",esclient)
  next();
};


exports.register.attributes = {
  pkg: require('./package.json')
};
