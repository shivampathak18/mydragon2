var Joi = require('joi');
var centralController = require('./central-ctrl');

var routes = [
  {
    path: '/heartbeat',
    method: 'GET',
    
    handler: function(request, reply) {
      reply('Hello ' + encodeURIComponent(request.params.user) + '!'+ JSON.stringify(request.sc));
    },
    config: {
      pre: [
            {method: function(request, reply) {
      console.log('adding Hello1');
      request['sc'] = {};
      setTimeout(function(){request.sc['hello1'] = '1'; console.log(request.sc);reply();}, 1000);

    }},
    {method:function(request, reply) {
      console.log('calling Hello2');

      console.log(request.sc);
      reply();

    }}
    ],
      auth: {
        strategies: ['simple']
      }
    }
  },
  {
    path: '/search',
    method: 'POST',
    handler: function(request, reply) {
      //console.log('server = '); console.log(server);
      //console.log('request = '); console.log(request);
      //reply('Hello ' + encodeURIComponent(request.params.query) + '!');
      centralController.controller(request,reply);
    },
    config: {
      auth: {
        strategies: ['simple']
      }
    }
  },
  {
    path: '/upload',
    method: 'POST',
    handler: function(request, reply) {
      //console.log('server = '); console.log(server);
      //console.log('request = '); console.log(request);
      //reply('Hello ' + encodeURIComponent(request.params.query) + '!');
      centralController.controller(request,reply);
    },
    config: {
      auth: {
        strategies: ['simple']
      }
    }
  },
  {
    path: '/browse',
    method: 'POST',
    handler: function(request, reply) {
      //console.log('server = '); console.log(server);
      //console.log('request = '); console.log(request);
      //reply('Hello ' + encodeURIComponent(request.params.query) + '!');
      centralController.controller(request,reply);
    },
    config: {
      auth: {
        strategies: ['simple']
      }
    }
  },
  {
    path: '/user/details',
    method: 'POST',
    handler: function(request, reply) {
      //console.log('server = '); console.log(server);
      //console.log('request = '); console.log(request);
      //reply('Hello ' + encodeURIComponent(request.params.query) + '!');
      centralController.controller(request,reply);
    },
    config: {
      auth: {
        strategies: ['simple']
      }
    }
  },
  {
    path: '/data',
    method: 'POST',
    handler: function(request, reply) {
      //console.log('server = '); console.log(server);
      //console.log('request = '); console.log(request);
      //reply('Hello ' + encodeURIComponent(request.params.query) + '!');
      centralController.controller(request,reply);
    },
    config: {
      auth: {
        strategies: ['simple']
      }
    }
  },
  {
    path: '/collections',
    method: 'POST',
    handler: function(request, reply) {
      //console.log('server = '); console.log(server);
      //console.log('request = '); console.log(request);
      //reply('Hello ' + encodeURIComponent(request.params.query) + '!');
      centralController.controller(request,reply);
    },
    config: {
      auth: {
        strategies: ['simple']
      }
    }
  },
  {
    path: '/trending/data',
    method: 'POST',
    handler: function(request, reply) {
      //console.log('server = '); console.log(server);
      //console.log('request = '); console.log(request);
      //reply('Hello ' + encodeURIComponent(request.params.query) + '!');
      centralController.controller(request,reply);
    },
    config: {
      auth: {
        strategies: ['simple']
      }
    }
  },
  {
    path: '/user/search/history',
    method: 'POST',
    handler: function(request, reply) {
      //console.log('server = '); console.log(server);
      //console.log('request = '); console.log(request);
      //reply('Hello ' + encodeURIComponent(request.params.query) + '!');
      centralController.controller(request,reply);
    },
    config: {
      auth: {
        strategies: ['simple']
      }
    }
  },
  {
    path: '/user/upload/history',
    method: 'POST',
    handler: function(request, reply) {
      //console.log('server = '); console.log(server);
      //console.log('request = '); console.log(request);
      //reply('Hello ' + encodeURIComponent(request.params.query) + '!');
      centralController.controller(request,reply);
    },
    config: {
      auth: {
        strategies: ['simple']
      }
    }
  },
  {
    path: '/user/subscription',
    method: 'POST',
    handler: function(request, reply) {
      //console.log('server = '); console.log(server);
      //console.log('request = '); console.log(request);
      //reply('Hello ' + encodeURIComponent(request.params.query) + '!');
      centralController.controller(request,reply);
    },
    config: {
      auth: {
        strategies: ['simple']
      }
    }
  },
  {
    path: '/categories',
    method: 'POST',
    handler: function(request, reply) {
      //console.log('server = '); console.log(server);
      //console.log('request = '); console.log(request);
      //reply('Hello ' + encodeURIComponent(request.params.query) + '!');
      centralController.controller(request,reply);
    },
    config: {
      auth: {
        strategies: ['simple']
      }
    }
  },
  {
    path: '/auth-plugins/simple-auth',
    method: 'GET',
    handler: function(request, reply) {
      reply('hello, ' + request.auth.credentials.name);
    },
    config: {

    }
  }
]

module.exports = routes
