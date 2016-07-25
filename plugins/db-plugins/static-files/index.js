var routes = require("./modules/files/file-routes");
var Mongoose = require("mongoose");
var CronJob = require('cron').CronJob;
var linkDao = require('./modules/links/link-dao');
var moment = require('moment');
var _ = require('underscore');
var fs = require('fs');
var path = require('path')

exports.register = function (server, options, next) {

  server.plugins["static-files"] = options
  var conn = Mongoose.connect(options['mongo_uri'])

  var job = new CronJob({
    cronTime: '*/1 * * * * *',
    onTick: function() {
      linkDao.find({
        expires_at : {
          $lt : moment()
        },
        status : 'LIVE'
      }, function(err, links){

        if(err){
          return console.log(err)
        }

        _.each(links, function(link){
            console.log(link)
            linkDao.update({
                _id : link['_id']
              },
              {
                $set : {
                  status : 'DELETED'
                }
              },
              function(err){
                if(err){
                  return console.log(err)
                }

                fs.unlink(link['path'], function(err){
                  if(err){
                    return console.log(err)
                  }
                  fs.rmdirSync(path.dirname(link['path']))
                })
            });
        })
      });
    },
    start: false
  });
  job.start();


  server.route(routes)
  next();
};


exports.register.attributes = {
    pkg: require('./package.json')
};
