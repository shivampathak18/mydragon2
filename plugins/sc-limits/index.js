var Redis = require('redis');
var _ = require('underscore');

var SCLimits = function(config){
  this._config = config;
  // this._mongo = new CatboxMongo(options['mongo']);
  this._redis = Redis.createClient(config['port'], config['host'],
                                   config['options'])

  this._redis.on("connect", function(){
    console.log("[sc-limits] Connected to Redis using the following config", 
                JSON.stringify(config))
  })

  this._redis.on("error", function(err){
    console.log("[sc-limits] Error : ", err)
  })

}

// SCLimits.prototype.get = function(ip, user, route_options){
//   console.log()

//   var key = ip + user;


// }


SCLimits.prototype.update = function(request, callback){
  var self = this

  var path = request.route.path;
  var uid = null; 
  // API is behind a proxy so use XFF and then fall back to remoteAddress.
  var ip = request.headers['X-Forwarded-For'] || request.info.remoteAddress

  if(request.auth.isAuthenticated){
    uid = request.auth.credentials['email']
  }
  else{
    uid = ip
  }

  try{
    var rate_limits = (request.route.settings
                            .plugins['sc-limits']['rate_limits'])
  }
  catch(e){
    console.log("No rate limits", e, path, uid, ip)
    return callback(null, []);    
  }


  var limit_details = []

  multi = self._redis.multi();
  _.each(rate_limits, function(limit){
    var key = uid + '|' + path + '|' + limit['period'];
    multi.incr(key)
  })

  multi.exec(function (err, replies) {
    console.log(replies);
    var exceeded = false;
    _.each(_.zip(replies, rate_limits), function(x){
      var value = x[0];
      var limit = x[1];
      console.log(limit, value)

      if(value == 1){
        // Key has just been set and incremented. Set the exipry time
        var key = uid + '|' + path + '|' + limit['period'];
        self._redis.expire(key, limit['period'] * 60)
      }

      if(value > limit['limit']){
        exceeded = true;
      }
      else{
        limit_details.push({
          'period': limit['period'],
          'limit': limit['limit'],
          'usage': value
        })
      }
    })
    if(exceeded){
      callback("Limit Exceeded", null)
    }
    else{      
      callback(null, limit_details)
    }
  });

}


exports.register = function (server, options, next) {

    var limits = new SCLimits(options);
    server.expose('limits', limits)
    next();
};


exports.register.attributes = {
    pkg: require('./package.json')
};
