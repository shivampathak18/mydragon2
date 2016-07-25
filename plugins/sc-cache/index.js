var Items = require("items");
// var CatboxMongo = require("catbox-mongodb");
var CatboxRedis = require("catbox-redis");
var _ = require("underscore");
var md5 = require("MD5");
var flatten = require("flat");

var Cache = function(options){
  this._options = options;
  // this._mongo = new CatboxMongo(options['mongo']);
  this._redis = new CatboxRedis(options['redis']);
  this._ignore = options['ignore'];
}

Cache.prototype.start = function(){
  var self = this;
  self._redis.start(function(err){
    if(err){
      console.log("Redis start error.", err)
    }
  });
}

Cache.prototype.set = function(key, value, callback){
  var self = this;

  // console.log("Redis set args", arguments)

  ttl = self._options['redis']['ttl']

  self._redis.set(key, value, ttl, function(err){
    if(err){
      console.log("Redis set error", err)
      return callback(err)
    }
    return callback(null, null)
  });
}

Cache.prototype.get = function(key, callback){
  var self = this;
  var callback = callback
  self._redis.get(key, function(err, cached){
    if(err){
      return callback(err)
    }
    return callback(null, cached)
  });
}

Cache.prototype._can_cache = function(req){

  var self = this;
  if(_.contains(self._ignore, req.path)){
    // Ignore this endpoint for caching
    return false
  }



  // Check if a file like object is present in the payload
  try{
    var content_type = req.headers['content-type'].split(';')[0]
    // if(content_type === 'multipart/form-data'){

    //   console.log(req.headers)
    //   // Don't cache payloads with file.
    //   // Most likely an upload like request.
    //   // #TODO check further for a file before letting the reply pass through
    //   console.log("Skip caching for this request")
    //   return false;
    // }
  }
  catch(e){
  }


  return true;
}

Cache.prototype._generate_id = function(req){

  var can_cache = this._can_cache(req);
  if(!can_cache){
    console.log("Cannot cache this request")
    return null
  }

  var url = req.path
  var query = req.query
  var payload = req.payload

  payload = _.flatten(_.pairs(flatten(payload))).sort().join('')
  query = _.flatten(_.pairs(flatten(query))).sort().join('')

  console.log(url, query, payload, "KEY")

  var message = url + query + payload
  console.log(message)

  return md5(message);
}

Cache.prototype.get_key = function(req){
  try{  
    var id = this._generate_id(req)
  }
  catch(e){
    console.log(e)
    return null
  }
  if (!id){
    return null
  }

  var key =   {
    segment : req.path,
    id : id
  }

  console.log(key)

  return key
}


Cache.prototype.add = function(req, callback){

  var key = this.get_key(req)
  if(!key){
    return callback(new Error("Cannot generate key"))
  }

  var value = req.response.source

  this.set(key, value, function(err){
    console.log("adding", arguments)
    return callback(err)
  })

}


exports.register = function (server, options, next) {
  var cache = new Cache(options);
  cache.start();
  server.expose('cache', cache)
  next();
};


exports.register.attributes = {
  pkg: require('./package.json')
};
