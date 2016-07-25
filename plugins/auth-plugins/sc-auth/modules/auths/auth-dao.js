/**
 * Dao layer which actually gets auth from the datastore
 *
 * @type {exports}
 */
var Bcrypt = require('bcrypt') ,
  Boom = require('boom'),
  Mongoose = require('mongoose');

var Schema = Mongoose.Schema;

/**
 * @module  User
 * @description contain the details of Attribute
 */
var users = new Schema({
  
  _id: {
    type: String,
    unique: true,
    required: true
  },

  firstname: {
    type: String,
    required: true
  },

  lastname: {
    type: String,
    required: true
  },

  email: {
    type: String,
    unique: true,
    required: true
  },

  /**
  * password. It can only contain string, is required field.
  */
  password: {
    type: String,
    required: true
  },

  _roles: {
    type: String,
    required: true,
  },

  _allowed_read_prefixes: {
    type: Array,
    required: true
  },

  _allowed_write_prefixes: {
    type: Array,
    default: []
  },

  /**
  * SocialCops MetaData: Put whatever extra information you want here.
  */
  _scmd: Schema.Types.Mixed
});
var Users = Mongoose.model('users', users);

var User = {};
User.createUser = function(userdetails, callback) {

  userdetails._id = Mongoose.Types.ObjectId();
  userdetails._roles = ["regular"];
  userdetails._allowed_read_prefixes = ["/sc"];
  userdetails._allowed_write_prefixes = [];
  userdetails._scmd = {
    // Last Modified Time
    lmt: new Date(),
    // Entitiy Creation Time
    ect: new Date()
  };
  userdetails.password = Bcrypt.hashSync(userdetails.password, 10);
  var user = new Users(userdetails);
  user.save(callback);
}

User.deleteUser = function(user, callback) {
  user.remove(callback);
}

User.findByEmail = function(email, callback) {
  Users.findOne({ email: email }, callback);
}

User.findByEmail = function(email, callback) {
  Users.findOne({ email: email }, callback);
}

User.findById = function(_id, callback) {
  Users.findOne({ _id: _id }, callback);
}

/** export schema */
module.exports = {
  User: User
};
