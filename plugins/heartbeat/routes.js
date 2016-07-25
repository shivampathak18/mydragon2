var Joi = require('joi');
var hbController = require('./hb-ctrl');

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
    path: '/heartbeat/{query}/{type}',
    method: 'GET',
    handler: function(request, reply) {
      //console.log('server = '); console.log(server);
      //console.log('request = '); console.log(request);
      //reply('Hello ' + encodeURIComponent(request.params.query) + '!');
      hbController.controller(request,reply);
    },
    config: {
      auth: {
        strategies: ['token']
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
