var Boom = require('boom');
var Mongoose = require('mongoose');

var daySchema = new Mongoose.Schema({
  path : { type: String, index: true },
  name : String,
  timestamp : Date,
  count: Number,
  ttl: { type: Date, expires: 60*60*24 }
});

var weekSchema = new Mongoose.Schema({
  path : { type: String, index: true },
  name : String,
  timestamp : Date,
  count: Number,
  ttl: { type: Date, expires: 60*60*24*7 }
});

var monthSchema = new Mongoose.Schema({
  path : { type: String, index: true },
  name : String,
  timestamp : Date,
  count: Number,
  ttl: { type: Date, expires: 60*60*24*30 }
});

exports.day = Mongoose.model('Day', daySchema);
exports.week = Mongoose.model('Week', weekSchema);
exports.month = Mongoose.model('Month', monthSchema);