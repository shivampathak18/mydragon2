var ejs = require('elastic.js');
var _ = require('underscore');
var Q = require('q');
var client = require('../../../../../../config/esclient');
var ReadableSearch = require('elasticsearch-streams').ReadableSearch;
var bigInt = require('big-integer');

//
exports.createResponseForNoFetch = function(error){
  var emptyFetchResponse = {};
  emptyFetchResponse['cols'] = [];
  emptyFetchResponse['rows'] = [];
  emptyFetchResponse['meta'] = {};
  emptyFetchResponse['path'] = '';
  emptyFetchResponse['total_hits'] = 0;
  emptyFetchResponse['metadata_index'] = undefined;
  emptyFetchResponse['token'] = '';
  emptyFetchResponse['boundary_path'] = '';
  emptyFetchResponse['RelatedDatasets']['list'] = [];
  emptyFetchResponse['RecommendedDatasets']['list'] = [];
  emptyFetchResponse['error'] = error;
  return emptyFetchResponse;
}

exports.createResponseForNoFetchRelatedDatasets = function(error){
  var emptyFetchResponse = {};  
  emptyFetchResponse['RelatedDatasets']['list'] = [];
  emptyFetchResponse['RecommendedDatasets']['list'] = [];
  emptyFetchResponse['error'] = error;
  return emptyFetchResponse;
}

// Helpers
function pathCreator (path) {
  var newPath;
  if (typeof path === 'undefined') {
    newPath = '/sc';
  } else {
    newPath = '/' + path;
  }
  return newPath;
}

function getDataFileToken(){
  var now = (new Date()).getTime();
  
  // Expire at
  now = now + (1000 * 300)
  // An Ode to Malviya Nagar B121
  var token = bigInt(now.toString().split("").reverse()
                        .join("")).toString(121)
  return (new Buffer(token)).toString('base64');
}

exports.parseDataFileToken = function(token){
  console.log(token)
  token = new Buffer(token, 'base64').toString('ascii');
  var exp = +bigInt(token, 121).toString().split("").reverse().join("");
  if(Math.abs(exp - (new Date().getTime())) > (1000 * 300)){
    return 0;
  }
  else {
    return exp;
  }
}

exports.createDataPreviewResponse = function (originalResponse, options) {
  var newResponse = {};
  if (_.isEmpty(originalResponse.hits.hits)) {
    newResponse.rows = [];
    newResponse.cols = [];
    return newResponse;
  }
  else {
    var sources = _.pluck(originalResponse.hits.hits, '_source')
    var metadata = JSON.parse(sources[0]['__metadata__']); 
    var removedMetadata = _.map(sources, function (source) {
      return _.omit(source, ['__metadata__', 'node_type', 'boundary_path']);
    });
    newResponse.cols = metadata.columns;
    newResponse.rows = removedMetadata;
    newResponse.meta = metadata.metadata;
    newResponse.path = metadata.path;
    newResponse.total_hits = originalResponse.hits.total;
    newResponse.metadata_index = metadata.metadata_index;
    newResponse.token = getDataFileToken();
    newResponse.boundary_path = metadata.boundary_path;
    return newResponse;
  }
}

// Filter type handlers
var _filter_handlers = {

  range : function(filter){

    if(_.isNumber(filter['equals'])){
      return ejs.RangeFilter(filter['col_name'])
          .gte(filter['equals'])
          .lte(filter['equals'])
    }

    var query = ejs.RangeFilter(filter['col_name'])

    if(_.isNumber(filter['more_than'])){
      query.gte(filter['more_than'])
    }

    if(_.isNumber(filter['less_than'])){
      query.lte(filter['less_than'])
    }
    return query

  },

  search : function(filter){
    if(_.isEmpty(filter['query']))
      return

    if(_.isArray(filter['query'])){
      var filters = _.map(filter['query'], function(query){

        return ejs.QueryFilter(
          ejs.QueryStringQuery()
            .fields(filter['col_name'])
            .query(query)
        )
      })
      return ejs.OrFilter(filters)

    }

    return ejs.QueryFilter(
      ejs.QueryStringQuery()
        .fields(filter['col_name'])
        .query(filter['query'])
    )
  }

}

// Sort type handlers
var _sort_handlers = {

  asc : function(col_name){  
    return ejs.Sort(col_name).asc();
    
  },
  desc : function(col_name){    
    return ejs.Sort(col_name).desc();
  }
}

var buildQuery = function(path, options){

  var filters = [];
  var sortFields = [];

  // Add match_phrase_prefix
  var orFilters = []
  _.each(options._readable_prefixes, function(prefix){
    orFilters.push(ejs.PrefixFilter('boundary_path', prefix))
    orFilters.push(ejs.PrefixFilter('path', prefix))    
  })
  filters.push(ejs.OrFilter(orFilters))

  if(!_.isEmpty(options['filters'])){  
    var _filters = JSON.parse(options['filters'])
    _.each(_filters, function(filter){
      var built_filter = _filter_handlers[filter['type']](filter)
      if(built_filter){
        filters.push(built_filter);
      }
    });
  }

  if(!_.isEmpty(options['sortBy'])){  
    var _sortBy = JSON.parse(options['sortBy']);
    _.each(_sortBy, function(sortObj){
      sortFields.push(_sort_handlers[sortObj['type']](sortObj['col_name']));
    });
  }

  queryObj = ejs.Request()
  .sort(sortFields)
  .query(
    ejs.FilteredQuery(
      ejs.MatchAllQuery(),
      ejs.AndFilter(
        filters
      )
    )
  )
  .toJSON();

  // console.log(JSON.stringify(queryObj));

  return queryObj

}

exports.fetchDataPreview = function (path, options) {
  path = pathCreator(path);
  var dfd = Q.defer();
  var size = (typeof options.size === 'undefined')? 10: options.size;
  var queryObj = buildQuery(path, options)

  var size = (typeof options.size === 'undefined')? 10: options.size;
  var from = (typeof options.from === 'undefined')? 0: options.from;

  /*
  console.log(size, from)

  console.log('fetch query');
  console.log(JSON.stringify(queryObj));

  console.log(JSON.stringify({
    index: 'kraken',
    body: queryObj,
    type: path,
    size: size,
    from: from
  }))*/

  client.search({
    index: 'kraken',
    body: queryObj,
    type: path,
    size: size,
    from: from
  }, function (error, response) {
    if (_.isEmpty(error)) {
      dfd.resolve(response);
    } else {
      console.log('rejecting');
      console.log(arguments);
      dfd.reject({error: error});
    }
  });
  return dfd.promise;
}

function _RD_aggregationFilters(options){
  var andFilters = [];
  var orFilters_readaccess = [];
  var orFilters = [];
  // Add match_phrase_prefix
  _.each(options._readable_prefixes, function(prefix){
    orFilters_readaccess.push(ejs.PrefixFilter('boundary_path', prefix))
    orFilters_readaccess.push(ejs.PrefixFilter('path', prefix))    
  });

  ////console.log('options are-', options);

  if (!(_.isEmpty(options.tags))) {
    //console.log('adding tags');
    var tagsFilter = ejs.TermsFilter('metadata.tags', options.tags);    
    orFilters.push(tagsFilter);
  }

  if (!(_.isEmpty(options.source_name))) {
    //console.log('adding tags');
    var sourceFilter = ejs.TermFilter('metadata.source_name', options.source_name);    
    orFilters.push(sourceFilter);
  }  
  andFilters.push(ejs.OrFilter(orFilters));
  andFilters.push(ejs.OrFilter(orFilters_readaccess));

  return andFilters;
};

exports.createRecommendedDatasetsResponse = function(originalResponse){

  var newResponse = {};
  if (_.isEmpty(originalResponse.aggregations.aggs_filters.top.hits.hits)) {
    newResponse.list = [];
    //newResponse.cols = [];
    return newResponse;
  }
  else {
    var allHits = _.pluck(originalResponse.aggregations.aggs_filters.top.hits.hits, '_source');    
    
    var list = _.map(allHits,function(source){
      return {'boundary_path':source.boundary_path,'path':source.path,'metadata_index':source.metadata_index,'title':source.metadata.title};
    });

    newResponse.list = list;
    return newResponse;
  }
}

exports.fetchRecommendedDatasets = function(metadata,exactPath,options){
  var dfd = Q.defer();
  var tags = metadata.tags;
  var source_name = metadata.source_name;

  var filters = [];
  var leafFilter = ejs.TermFilter('node_type', 'leaf');
  filters.push(leafFilter);  

  var aggsOptions = {'_readable_prefixes':options._readable_prefixes,'tags':tags,'source_name':source_name};

  var aggFilters = _RD_aggregationFilters(aggsOptions);

  var queryObj = ejs.Request()
  .query(
    ejs.FilteredQuery(
      ejs.MatchAllQuery(),
      ejs.AndFilter(
        filters
      )
    )
  )  
  .agg(
    ejs.FilterAggregation('aggs_filters')
    .filter(ejs.AndFilter(
        aggFilters
    ))
    .agg(
        ejs.TopHitsAggregation('top')        
        .source([], ['columns', '__num*','*_suggest','current_node'])
        .size(3)
    )
  )  
  .toJSON();

  console.log('recommended datasets');
  console.log(JSON.stringify(queryObj));
 

  client.search({
    index: 'kraken',
    body: queryObj
  }, function (error, response) {
    if (typeof error !== 'undefined') {
      dfd.reject({ error: error });
    } else {
      dfd.resolve(response);
    }
  });
  return dfd.promise;
}

exports.createRelatedDatasetsResponse = function(originalResponse){

  var newResponse = {};
  if (_.isEmpty(originalResponse.aggregations.scores.buckets)) {
    newResponse.list = [];
    //newResponse.cols = [];
    return newResponse;
  }
  else {
    var allTops = _.pluck(originalResponse.aggregations.scores.buckets, 'top');
    var list = [];    
    _.map(allTops, function (top) {
      //return _.omit(source, ['__metadata__', 'node_type', 'boundary_path']);
      _.map(_.pluck(top.hits.hits, '_source'),function(source){
        list.push({'boundary_path':source.boundary_path,'path':source.path,'metadata_index':source.metadata_index,'title':source.metadata.title});
      });
    });
    newResponse.list = list;
    return newResponse;
  }
  //return response;
}

exports.fetchRelatedDatasets = function(boundary_path, exactPath, options){

  var dfd = Q.defer();
  var filters = [];
  var orFilters = [];
  var notFilters = [];

  _.each(options._readable_prefixes, function(prefix){
    orFilters.push(ejs.PrefixFilter('boundary_path', prefix))
    orFilters.push(ejs.PrefixFilter('path', prefix))    
  })
  filters.push(ejs.OrFilter(orFilters))

  var leafFilter = ejs.TermFilter('node_type', 'leaf');
  var boundaryFilter = ejs.TermFilter('boundary_path',boundary_path);
  var pathFilter = ejs.NotFilter(ejs.TermFilter('path',exactPath));
  filters.push(leafFilter);
  filters.push(boundaryFilter);
  filters.push(pathFilter);
  //notFilters.push(pathFilter);

  var queryObj = ejs.Request()
  .query(
    ejs.FilteredQuery(
      ejs.MatchAllQuery(),
      ejs.AndFilter(
        filters
      )
    )
  )  
  .agg(
    ejs.TermsAggregation('scores')
    .field('metadata_index')
    .order('_term','desc')    
    .agg(
        ejs.TopHitsAggregation('top')        
        .source([], ['columns', '__num*','*_suggest','current_node'])
        .size(10)
    )
  )
  //.source([], ['*_suggest', 'columns'])
  .toJSON();

  console.log('related datasets');
  console.log(JSON.stringify(queryObj));

  client.search({
    index: 'kraken',
    body: queryObj
  }, function (error, response) {
    if (typeof error !== 'undefined') {
      dfd.reject({ error: error });
    } else {
      dfd.resolve(response);
    }
  });

  return dfd.promise;

}

exports.fetchFilteredDataFile = function(path, options){
  path = pathCreator(path)

  var queryObj = buildQuery(path, options)

  var size = (typeof options.size === 'undefined')? 10: options.size;
  var offset = size
  var start = -size

  var searchExec = function(from, callback) {
    client.search({
      index: 'kraken',
      type: path,
      body: queryObj,
      size: size,
      from: start + offset
    }, callback);

    start += offset

  };

  return new ReadableSearch(searchExec);
}