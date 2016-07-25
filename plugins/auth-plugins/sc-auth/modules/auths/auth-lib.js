var Boom = require('boom'),
  Bcrypt = require('bcrypt'),
  User = require('./auth-dao').User,
  Redis = require('redis'),
  jwt = require('jsonwebtoken');

exports.simpleValidate = function(username, password, callback) {

  User.findByUsername(username, function(err, user) {
    if (!err) {
      if (user === null) {
        return callback(null, false);
      }
      if (Bcrypt.compareSync(password, user._doc.password)) {
        callback(null, true, { username: user._doc.username });
      } else {
        callback(err, false);
      }
    } else {
      callback(err, false);
    }
  });
};

exports.tokenValidate = function (decodedToken, callback) {

  User.findById(decodedToken.uid, function(err, user) {
    if (!err) {
      if (user === null) {
        return callback(null, false);
      } else {
        var credentials = user._doc;
        callback(null, true, credentials);
      }
    } else {
      callback(err, false);
    }
  });
};

exports.checkIfLoggedOut = function (req, callback) {
  
  var redisClient = Redis.createClient(),
    token = req.headers.authorization.split(' ')[1],
    decodedToken = jwt.decode(token);

  redisClient.on('error', function (err) {
    console.log("Error " + err);
  });

  redisClient.get(token, function (err, val) {
    if (!err) {
      if (val != null) {
        return callback(null, true);
      }
      else {
        return callback(null, false);
      }
    }
    else {
      return callback(err, false);
    }
  });
};

exports.hasFullAuthorization = function (role, Config) {
  if (role === Config.constants.authorization_roles.FULL) {
    return true;
  }
  return false;
};
