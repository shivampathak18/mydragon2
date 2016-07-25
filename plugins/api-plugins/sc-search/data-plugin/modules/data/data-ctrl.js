/**
 * Controller which handles requests/responses relating to datum
 *
 * @type {datumDao|exports}
 */
var Boom = require('boom');
var DataLib = require('./data-lib');
var stream = require('stream');
var fs = require('fs');
var _ = require('underscore');
var converter = require('json-2-csv');
var Q = require('q');

var Mongoose = require('mongoose');
var trendingDao = require('./data-dao');
var trendingDatasetsDay = Mongoose.model('Day');
var trendingDatasetsWeek = Mongoose.model('Week');
var trendingDatasetsMonth = Mongoose.model('Month');

/**
 * Fetches data from a particular dataset
 *
 * @param req
 * @param reply
 */
 var _this = this;

exports.fetch = function (req, reply) {
	var path = req.params.path;
	var options = req.query;
  var datasetsDay, datasetsWeek, datasetsMonth;

  // Add readable paths to options. default to only /sc prefix
  var creds = req.auth.credentials;

  options['_readable_prefixes'] = (creds && creds._allowed_read_prefixes
                                    || ['/sc']);
  //console.log(options);
  //reply([]);

	DataLib.fetchDataPreview (path, options)
	.then(function (response) {
		var dataResponse = DataLib.createDataPreviewResponse(response, options);
    var actual_path = '/'+path;
    if(!_.isEmpty(dataResponse.boundary_path) && !_.isEmpty(dataResponse.meta))
    Q.allSettled([_this.fetchRelatedDatasets(dataResponse.boundary_path,actual_path,options),_this.fetchRecommendedDatasets(dataResponse.meta,actual_path,options)])
    .then(function (results) {
      results.forEach(function (result,index) {
        //console.log('result.state',result.state);
        if (result.state === "fulfilled") {
          //searchResponse = _.extend(searchResponse, result.value);
          if(index == 0){
            dataResponse['RelatedDatasets'] = result.value;
          }
          if(index == 1){
            dataResponse['RecommendedDatasets'] = result.value;
          } 
          
        } else {
          
          var reason = result.reason;
          eventEmitter.emit('search:error',result.reason);
        }
      });
      //console.log(searchResponse);
      datasetsDay = new trendingDatasetsDay({
        path : req.params.path,
        name : dataResponse.meta.title,
        ttl : new Date()
      });

      datasetsWeek = new trendingDatasetsWeek({
        path : req.params.path,
        name : dataResponse.meta.title,
        ttl : new Date()
      });

      datasetsMonth = new trendingDatasetsMonth({
        path : req.params.path,
        name : dataResponse.meta.title,
        ttl : new Date()
      });
      if (options.from === undefined || +options.from === 0) {
        console.log(req.params[0]);
        console.log("\t\t\tsave");
        datasetsDay.save();
        datasetsWeek.save();
        datasetsMonth.save();
        console.log("\t\t\t end save");
      };

      reply(dataResponse);
    })
    .catch(function(response) {
        console.log('error while getting related reco datasets');
        console.log(arguments);
        var noRelatedDatasets = DataLib.createResponseForNoFetchRelatedDatasets(response);
        dataResponse = _.extend(dataResponse,noRelatedDatasets);
        reply(dataResponse);
    });
  })
	.catch(function (response) {
    console.log('error while getting fetching main data');
		console.log(arguments);
		var noFetchResponse = DataLib.createResponseForNoFetch(response);
    reply(noFetchResponse);
	});  
};

exports.fetchRelatedDatasets = function(boundary_path,path,options){
  var dfd = Q.defer();

  DataLib.fetchRelatedDatasets(boundary_path, path, options)   
  .then(function(response) {
    var fetchResponse = DataLib.createRelatedDatasetsResponse(response);
    dfd.resolve(fetchResponse);
  })
  .catch(function(response) {
    console.log(arguments);
    dfd.reject({ error: response });
  });

  return dfd.promise;
}

exports.fetchRecommendedDatasets = function(metadata,path,options){
  var dfd = Q.defer();

  DataLib.fetchRecommendedDatasets(metadata, path, options)   
  .then(function(response) {
    var fetchResponse = DataLib.createRecommendedDatasetsResponse(response);
    dfd.resolve(fetchResponse);
  })
  .catch(function(response) {
    console.log(arguments);
    dfd.reject({ error: response });
  });

  return dfd.promise;
}

exports.fetchFileForExcelPlugin = function(req, reply){

  var path = req.params.path;
  var options = req.query;

  options['size'] = (typeof options.size === 'undefined')? 10: +options.size;
  options['from'] = (typeof options.from === 'undefined')? 0: +options.from;

  // Add readable paths to options. default to only /sc prefix
  var creds = req.auth.credentials
  options['_readable_prefixes'] = (creds && creds._allowed_read_prefixes
                                   || ['/sc'])

  console.log(options)

  DataLib.fetchDataPreview (path, options)
  .then(function (response) {

    var hits = _.pluck(response.hits.hits, '_source')
    var metadata = JSON.parse(hits[0]['__metadata__']); 
    var columns_lkp = {}
    _.each(metadata.columns, function(col){
      columns_lkp[col['internal_name']] = col['description']
                                          .replace("\n", " ")
    })

    hits = _.map(hits, function (_hit) {
      _hit = _.omit(_hit, ['__metadata__', 'node_type', 'boundary_path']);
      var hit = {}
      _.each(_hit, function(v, k){
        hit[columns_lkp[k]] = v
      })
      return hit
    });

    options = {
      DELIMITER : {
        WRAP: '"'
      }
    }

    converter.json2csv(hits, function(err, csv){
      if(!err){  
        reply(csv)
      }
    }, options)


  })
  .catch(function (response) {
    console.log(arguments);
    reply(response);
  });  

}

exports.trendingData = function(req, reply){
console.log("enter trends");  
var someTrend =trendingDatasetsDay.collection.aggregate(
  [{
    $group: {
      _id: {
        path: "$path",
        name: "$name"},
        hits: { $sum: 1}}}],
        function(err, result){
          reply({
            day: result
          })
        });
}
exports.fetchFile = function(req, reply){
  var path = req.params.path;
  var options = req.query;

  if(!options['token']){
    return reply(Boom.notFound('File Not Found'));
  }

  var token = options['token'];
  var exp = DataLib.parseDataFileToken(token)

  console.log(exp)

  if(exp < (new Date().getTime())){
    return reply(Boom.notFound('File Not Found'));
  }

  // Add readable paths to options. default to only /sc prefix
  var creds = req.auth.credentials
  options['_readable_prefixes'] = (creds && creds._allowed_read_prefixes
                                    || ['/sc'])

  options['size'] = 1000
  var rs = DataLib.fetchFilteredDataFile (path, options)

  var outputStream = stream.Readable();
  outputStream._read = function (size) {
  };

  var first_line = true
  var col_lkp = {}
  var records = 0

  var excluded_columns = ['__metadata__', 'boundary_path', 'node_type']
  
  var parsed_excluded_cols = []
  try{  
    var parsed_excluded_cols = JSON.parse(options['excludedColumns'])
  }
  catch(e){
    console.log(e)
  }

  excluded_columns = excluded_columns.concat(parsed_excluded_cols)


  rs.on('readable', function(){
    var data;
    while (null !== (data = rs.read())) {
      var source = data['_source']
      var _metadata = JSON.parse(source['__metadata__'])
      source = _.omit(source, excluded_columns)

      if(first_line){
        _.each(_metadata['columns'], function(x){
          col_lkp[x['internal_name']] = x['description']
        })

        var header = []
        _.each(source, function(v, k){
          header.push(col_lkp[k])
        })
      }

      options = {
        DELIMITER : {
          WRAP: '"'
        }
      }

      converter.json2csv(source, function(err, csv){
        if(!err){
          if(first_line){
            var row = '"' + header.join('","') + '"\n' + csv.split('\n')[1]
            outputStream.push(row + '\n')
            first_line = false
          }
          else{
            outputStream.push(csv.split('\n')[1] + '\n')
          }
        }
        else {
          console.log("ERROR \t\t", err)
        }
        records += 1
      }, options)
    }

    if(records == rs.total){
      outputStream.push(null)
    }

    rs.on('end', function(){
      outputStream.push(null)      
    })

  })

  reply(outputStream)
  .header('Content-Type', 'text/csv')
  .header('Content-Disposition', 'inline; filename="filtered_data.csv"')

}