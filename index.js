

var _ = require('underscore');
var Basic = require('hapi-auth-basic');
var Bell = require('bell');
var Hapi = require('hapi');
var Boom = require('boom');

global.events = require('events');
global.eventEmitter = new events.EventEmitter();

var searchResponse = require('./response/response-ctrl');

var Config = require('./config/dev');

options = {
	connections: {
		routes: {
			cors: true
		}
	}
}


var server = new Hapi.Server(options);

server.connection({
	host: Config.server.host,
	port: Config.server.port
});

// TODO PreHandler for logout
server.ext('onPreHandler', function(req, reply){
  console.log('path', req.route.path)

  if(req.method === 'options'){
    return reply.continue()
  }

  else{
    var sc_limits = req.server['plugins']['sc-limits']['limits'];
    sc_limits.update(req, function(err, result){
      console.log(arguments)
      if(!err){
        reply.continue()
      }
      else{
        return reply(Boom.tooManyRequests('you have exceeded your request limit'));
      }
    })
  }
});


server.ext('onPreResponse', function(req, reply){

  // Trails Related
  // console.log(req)

  var history = req.server.plugins['trails']['history'];
  history.create(req)
  reply.continue()

});

//server.ext('',function())


// API version
server.realm.modifiers.route.prefix = '/api/v0';

server.register([
    {
      register: require('./plugins/sc-db'),
      options: Config['sc-db']
    }
  ],
  function(){

  }
)

server.register([
	{
		register: Basic
	},	
	{
		register: require('hapi-auth-jwt')
	},
	{
		register: require('./plugins/auth-plugins/sc-auth'),
		options: {
			Config: Config
		}
	},
  {
    register: require('./plugins/heartbeat'),
		options: {
			Config: Config
		}
  },
	{
		register: require('./plugins/api-plugins/sc-search/hydra'),
		options: {
			Config: Config,
			esclient : server.plugins['sc-db']['esclient']
		}
	},
  {
    register: require('./plugins/api-plugins/sc-search/data-plugin'),
    options: {
      Config: Config
    }
  },
	{
		register: require('./plugins/api-plugins/extras/datasets'),
		options: {
			Config: Config
		}
	},
  {
    register: require('./plugins/db-plugins/static-files'),
    options: {
      mongo_uri: 'mongodb://localhost:27017/socialcops',
      storage_path: '/var/tmp/sc-dragon/files/',
      link_path: '/var/tmp/sc-dragon/links/',
      expire_after: 30,
      storage_host: '128.199.79.88:8889'
    }
  },

  {
    register: require('./plugins/sc-limits'),
    options: {
      host: '127.0.0.1',
      port: 6379,
      database: 1
    }
  },

  /*
  // Caching Registration
  {
    register: require('./plugins/sc-cache'),
    options: {
      mongo: {
        host: '127.0.0.1',
        port: 27017,
        partition: 'sc-cache',
        ttl: 10000
      },

      redis: {
        host: '127.0.0.1',
        port: 6379,
        database: 0,
        partition:'sc-cache',
        ttl: 300
      },

      ignore: [
        '/login',
        '/token',
        '/logout',
        '/user',
      ]
    }
  }
  */
  {
    register: require('./plugins/db-plugins/trails'),
    options: {
      mongo : server.plugins['sc-db']['mongo']
    }
  },

  {
    register: require('./plugins/sc-upload'),
    options: {
      base_url : 'http://localhost:6543'
    }
  },

  {
    register: require('lout'),
    options: {
      endpoint: '/docs'
    }
  }

	], function() {
	  server.start(function () {
    console.log('Server started at: '
                  + server.info.uri
                  + ' with ['
                  + Object.keys(server.plugins).join(', ')
                  + '] enabled')
  });

});

module.exports = server;
