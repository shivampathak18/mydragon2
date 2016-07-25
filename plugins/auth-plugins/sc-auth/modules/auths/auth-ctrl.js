/**
 * Controller which handles requests/responses relating to auth
 *
 * @type {authDao|exports}
 */
var User = require('./auth-dao').User,
	authLib = require('./auth-lib'),
	Bcrypt = require('bcrypt'),
	Boom = require('boom'),
	Joi = require('joi'),
	jwt = require('jsonwebtoken'),
	Mongoose = require('mongoose'),
	Redis = require('redis');

function generateJwtToken(Obj, Config) {
	Obj.jti = Mongoose.Types.ObjectId();
	Obj.iat = (new Date).getTime();
	var options = { expiresInSeconds: Config.time.tokenExpirationSeconds },
		token = jwt.sign(Obj, Config.keys.privateKey, options);
	return token;
}


/**
* Signup and create a new user.
*
* @param req
* @param reply
*/
exports.createUser = function (req, reply) {

	// Check is email already exits
	User.findByEmail(req.payload.email, function (err, user) {
		if (user !== null) {
			return reply(Boom.conflict("Email already exists!"));
		} else {
			// Create a user
			User.createUser(req.payload, function(err, user) {
				if (!err) {
					reply({ email: user._doc.email,
						_id: user._doc._id,
						created: true });
					} else {
						console.log(err);
						reply(Boom.wrap(err));
					}
				});
			}
		});
}

/**
* Delete a user.
*
* @param req
* @param reply
*/
exports.deleteUser = function (req, reply) {

	var token = req.headers.authorization.split(' ')[1],
		payload = jwt.decode(token);
	User.findById(payload.uid, function(err, user) {
		if (!err) {
			if (user == null) {
				return reply(Boom.unauthorized('invalid user'));
			}
			else if (authLib.hasFullAuthorization(user._doc._role,
				req.server.plugins['sc-auth'].Config)) {
				User.findById(req.params._id, function(err, user) {
					if (!err) {
						if (user == null) {
							return reply(Boom.notFound('User not found'));
						}
						User.deleteUser(user, function(err, deleteduser) {
							if (!err) {
								reply({ username: deleteduser._doc.username,
									_id: deleteduser._doc._id,
									deleted: true });
							}
							else {
								reply(Boom.wrap(err));
							}
						});
					}
					else {
						reply(Boom.wrap(err));
					}
				});
			}
			else {
				reply(Boom.unauthorized('You don\'t have access to perform this operation'));
			}
		}
		else {
			reply(Boom.wrap(err));
		}
	});

}

/**
 * Authenticates a user and gives him a token.
 *
 * @param req
 * @param reply
 */
exports.login = function (req, reply) {

	User.findByEmail(req.payload.email, function(err, user) {
		if (!err) {
			if (user === null) {
				return reply(Boom.unauthorized('invalid user'));
			}
			if (Bcrypt.compareSync(req.payload.password, user._doc.password)) {
				var token = generateJwtToken({ uid: user._doc._id },
					req.server.plugins['sc-auth'].Config);
				reply({
					firstname: user._doc.firstname,
					lastname: user._doc.lastname,
					email: user._doc.email,
					token: token
				});
			} else {
				reply(Boom.unauthorized('invalid password'));
			}
		} else {
			console.log(err);
			reply(Boom.wrap(err));
		}
	});
};

/**
* Revoke access to a token by dumping it into redis
*
* @param req
* @param reply
*/
exports.logout = function (req, reply) {

	var redisClient = Redis.createClient(),
		token = req.headers.authorization.split(' ')[1],
		decodedToken = jwt.decode(token);

	redisClient.on('error', function (err) {
		console.log("Error " + err);
	});

	redisClient.set(token, JSON.stringify(decodedToken));
	redisClient.expire(token,
		req.server.plugins['sc-auth'].Config.time.tokenExpirationSeconds);

	reply(Boom.unauthorized('Logged out'));
};

/**
* Test endpoint controller
*
* @param req
* @param reply
*/
exports.test = function (req, reply) {

	authLib.checkIfLoggedOut(req, function (err, status) {
		if (status) {
			return reply(Boom.unauthorized('Logged out'));
		}
		else {
			reply('Wazzaaaap?');
		}
	});
};

/**
* Gives the user a fresh token
*
* @param req
* @param reply
*/
exports.token = function(req, reply) {

	var decodedToken = jwt.decode(req.payload.token);
	try {
		User.findById(decodedToken.uid, function(err, user) {
			if (!err) {
				if (user == null) {
					return reply(Boom.unauthorized('invalid user'));
				}
				else {
				var token = generateJwtToken({ uid: decodedToken.uid },
					req.server.plugins['sc-auth'].Config);
					reply({ token: token });
				}
			}
			else {
				reply(Boom.wrap(err));
			}
		});
	}
	catch (e) {
		reply(Boom.unauthorized('invalid user'));
	}
}
