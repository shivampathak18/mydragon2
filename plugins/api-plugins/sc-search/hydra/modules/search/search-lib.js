var ejs = require('elastic.js');
var _ = require('underscore');
var Q = require('q');
var Hoek = require('hoek');
var ProcessAgg = require('./modules/processAgg');
var client = require('../../../../../../config/esclient');
var moment = require('moment');
var QMap = require('./modules/qMap');


function createFilters(options) {
  var andFilters = [];
  var orFilters = [];
  if (!(_.isEmpty(options.or))) {
    _.each(options.or, function (tag) {
      var filter = ejs.TermFilter('_all', tag);
      orFilters.push(filter);
    });
  }

  // Add match_phrase_prefix
  _.each(options._readable_prefixes, function(prefix){
    orFilters.push(ejs.PrefixFilter('boundary_path', prefix))
    orFilters.push(ejs.PrefixFilter('path', prefix))    
  })

  if (!(_.isEmpty(options.and))) {
    _.each(options.and, function (tag) {
      var filter = ejs.TermFilter('_all', tag);
      andFilters.push(filter);
    });
  }
  if (!(_.isEmpty(options.asof_range))) {
    var asofRangeFilter = ejs.RangeFilter('metadata.as_of')
    .gte(options.asof_range[0])
    .lte(options.asof_range[1]);
    andFilters.push(asofRangeFilter);
  }
  if (!(_.isEmpty(options.frequency))) {
    var freqFilter = ejs.TermFilter('metadata.frequency.raw', options.frequency);
    andFilters.push(freqFilter);
  }
  if (!(_.isEmpty(options.region_level))) {
    var regionLevelFilter = ejs.TermFilter('metadata.data_granularity.raw', options.region_level);
    andFilters.push(regionLevelFilter);
  }
  if (!(_.isEmpty(options.source_type))) {
    var sourceTypeFilter = ejs.TermFilter('metadata.source_type.raw', options.source_type);
    andFilters.push(sourceTypeFilter);
  }
  andFilters.push(ejs.OrFilter(orFilters));
  return andFilters;
}

function createFiltersForAggregations(options){
  var andFilters = [];
  var orFilters = [];
  // Add match_phrase_prefix
  _.each(options._readable_prefixes, function(prefix){
    orFilters.push(ejs.PrefixFilter('boundary_path', prefix))
    orFilters.push(ejs.PrefixFilter('path', prefix))    
  });

  console.log('options are-', options);

  if (!(_.isEmpty(options.filterTags))) {
    console.log('adding tags');
    var tagsFilter = ejs.TermsFilter('metadata.tags', options.filterTags);    
    andFilters.push(tagsFilter);
  }
  
  if (!(_.isEmpty(options.asof_range))) {
    var asofRangeFilter = ejs.RangeFilter('metadata.as_of')
    .gte(options.asof_range['0'])
    .lte(options.asof_range['1']);
    andFilters.push(asofRangeFilter);
  }
  if (!(_.isEmpty(options.frequency)) && options.frequency != 'none') {
    var freqFilter = ejs.TermFilter('metadata.frequency', options.frequency);
    andFilters.push(freqFilter);
  }
  if (!(_.isEmpty(options.region_level)) && options.region_level != 'none') {
    var regionLevelFilter = ejs.TermFilter('metadata.data_granularity', options.region_level);
    andFilters.push(regionLevelFilter);
  }
  if (!(_.isEmpty(options.source_type)) && options.source_type != 'none') {
    var sourceTypeFilter = ejs.TermFilter('metadata.source_type', options.source_type);
    andFilters.push(sourceTypeFilter);
  }

  andFilters.push(ejs.OrFilter(orFilters));
  return andFilters;
};



function getSuggestions(queryString,suggestType) {
  var dfd = Q.defer();
  if(!suggestType || suggestType == "")
    suggestType = 'title_suggest';
    client.suggest({
      index: 'kraken',
      body: {
        suggester: {
          text: queryString,
          completion: {

            field: suggestType
          }
        }
      }
    }, function (error, response) {
      if (typeof error !== 'undefined') {
        dfd.reject({ error: error });
      } else {
        dfd.resolve(response);
      }
    });
    return dfd.promise;
  }

/**
* Constructs the API response for parent search endpoint.
*
* @param {Object} responses - Multisearch responses object
* @param {Object} options - Options used for the query
* @return {Object}
*/
exports.createParentSearchResponse = function (responses, options) {
//   return responses;
  var responses = responses.responses;
  var dataResponses = responses[0].aggregations.boundary.buckets;
  var leafResponses = responses[1].hits.hits;
  if (!(_.isEmpty(dataResponses))) {
    var finalDataResponse = _.map(dataResponses, function(dataResponse) {
      var topHits = _.pluck(dataResponse.top.hits.hits, '_source');
      var metadata = JSON.parse(topHits[0].__metadata__);
      var innerHits = _.map(topHits, function(topHit) {
        delete topHit.__metadata__;
        delete topHit.node_type;
        delete topHit.boundary_path;
        return topHit;
      });
      metadata.hits = innerHits;;
      return metadata;
    });
  }
  if (!(_.isEmpty(leafResponses))) {
    var finalLeafResponse = _.pluck(leafResponses, '_source');
    finalLeafResponse = _.map(finalLeafResponse, function(response) {
      response.hits = [];
      return response;
    });
  }
  var finalResponse = [];
  var paths = [];
  var unifiedResponses = _.union(finalLeafResponse, finalDataResponse);
  _.each(unifiedResponses, function(unifiedResponse) {
    if (_.indexOf(paths, unifiedResponse.path) === -1) {
      paths.push(unifiedResponse.path);
      finalResponse.push(unifiedResponse);
    } else {
      if (!(_.isEmpty(unifiedResponse.hits))) {        
        finalResponse[_.indexOf(paths, unifiedResponse.path)].hits = unifiedResponse.hits;
      }
    }
  });
  finalResponse = {
    hits: finalResponse
  };
  return finalResponse;
}

/**
* Constructs the API response for leaf search endpoint.
*
* @param {Object} response - Search responses object
* @param {Object} options - Options used for the query
* @return {Object}
*/
exports.createLeafSearchResponse = function(response, options) {
  var finalResponse = {};
  if (_.isEmpty(response.hits.hits)) {
    finalResponse.hits = [];
  } else {
    var hit = _.pluck(response.hits.hits, '_source')[0];
    var node = hit.node_description.slice(-2)[0];
    var inner_hit = {};
    inner_hit.metadata = hit.metadata;
    inner_hit.current_node = hit.current_node;
    inner_hit.path = hit.path;
    inner_hit.hits = [];
    inner_hit.metadata_index = hit.metadata_index;
    node.hits = [inner_hit];
    // FIXME Some weird shit happens here. Just try and uncomment the next line. I dare you. I double dare you.
    // node.hits = hit;
    finalResponse.hits = [];
    finalResponse.hits.push(node);
  }
  return finalResponse;
}

/**
*
* @param {Object} response - Search responses object
* 
* @return {Suggestion Array}
*/
exports.createLeafSuggestResponse = function(response){
  var suggestions = [];
  console.log('creating new suggestions');


  if (_.isEmpty(response.aggregations.boundary.buckets)) {
    console.log('no buckets');
  } else {
    var buckets = response.aggregations.boundary.buckets;
    console.log('bucket length', buckets.length);

    _.each(buckets, function(bucket) {
      console.log('getting bucket');      
      if(!_.isEmpty(bucket.top.hits)){
        var max_score = bucket.top.hits.max_score;
        if(!_.isEmpty(bucket.top.hits.hits)){
          _.each(bucket.top.hits.hits, function(hit) {
            if(hit._score === max_score){
              var item = {'payload':{}};
              var meta = hit._source.metadata;
              item.payload['suggest_value'] = meta.title;
              item.payload['description'] = meta.description;
              item.payload['suggest_field'] = 'title';
              item.payload['path'] = hit._source.path;
              item.payload['label'] = meta.title;

              item['text'] = meta.title;
              item['score'] = 100;
              suggestions.push(item);
            }            
          });
        }
      }
    });

  }

  return suggestions;

}

/**
* Constructs the ES query for fetching data.
*
* @param {string} queryString - Query string
* @param {Object} options - Options used for the query
* @return {promise}
*/
exports.search = function (queryString, options) {
  var dfd = Q.defer(),
  //filters = createFilters(options),
  size = (typeof options.size === 'undefined')? 10: options.size,
  from = (typeof options.from === 'undefined')? 0: options.from;

  // We don't want to use filters on ES side as we lose inner hits for a query string
  var filters = [];
  // Instead we will apply filters on node_type aggregation
  var aggFilters = createFiltersForAggregations(options);

  /*
  var orFilters = [];
  _.each(options._readable_prefixes, function(prefix){
    orFilters.push(ejs.PrefixFilter('boundary_path', prefix))
    orFilters.push(ejs.PrefixFilter('path', prefix))    
  });

  filters.push(ejs.OrFilter(orFilters));
  */
  /*
  ejs.FilterAggregation('node_types')
    .filter(ejs.AndFilter(
        aggFilters
    ))*/
  
  console.log('andFilters', ejs.AndFilter(aggFilters).toJSON());

  var queryObj = ejs.Request()  
  .query(
    ejs.FilteredQuery(
      ejs.QueryStringQuery(queryString)
      .defaultOperator('AND'),
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
    ejs.TermsAggregation('node_types')
    .field('node_type')
    .size(0)    
    .agg(
      ejs.TermsAggregation('boundary')
      .field('boundary_path')
      .size(0)     
      .agg(
        ejs.TopHitsAggregation('top')
        .size(3)
        .source([], ['columns', '__num*'])        
      )
    )
    .agg(
      ejs.TermsAggregation('tags')
      .field('tags')
      .size(0)
    )
    .agg(
      ejs.TermsAggregation('source_type')
      .field('source_type')
      .size(0)
    )
    .agg(
      ejs.TermsAggregation('data_granularity')
      .field('data_granularity')
      .size(0)
    )
    .agg(
      ejs.TermsAggregation('frequency')
      .field('frequency')
      .size(0)
    )
  ))
  .suggest(
    ejs.TermSuggester('my-suggestion')
    .text(queryString)
    .field('_all')
  )
  .toJSON();

  console.log('doing multiple aggs');
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
  })

  return dfd.promise;
}


/**
* Constructs the ES query for fetching data only from Leaf node.
*
* @param {string} queryString - Query string* 
* @return {promise}
*/
exports.searchInLeaf_suggestion = function (queryString, options) {
  var dfd = Q.defer(),
  filters = [],
  size = (typeof options.size === 'undefined')? 10: options.size,
  from = (typeof options.from === 'undefined')? 0: options.from;  

  var orFilters = [];
  // Add match_phrase_prefix
  _.each(options._readable_prefixes, function(prefix){
    orFilters.push(ejs.PrefixFilter('boundary_path', prefix))
    orFilters.push(ejs.PrefixFilter('path', prefix))    
  })
  filters.push(ejs.OrFilter(orFilters))

  var filter = ejs.TermFilter('node_type', 'leaf');
  filters.push(filter);

  var queryObj = ejs.Request()
  .query(
    ejs.FilteredQuery(
      ejs.QueryStringQuery(queryString)
      .defaultOperator('AND'),
      ejs.AndFilter(
        filters
      )
    )
  )
  .size(0)
  .agg(
    ejs.TermsAggregation('boundary')
    .field('boundary_path')
    .size(0)
    .agg(
      ejs.TopHitsAggregation('top')
      .size(3)
        .source([], ['columns', '__num*','*_suggest','node_description'])
    )
  )
  .toJSON();

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
  })

  return dfd.promise;
}

/**
* Constructs the ES query for searching under a parent.
*
* @param {string} queryString - Query string
* @param {Object} options - Options used for the query
* @return {promise}
*/
exports.searchUnderParent = function(queryString, options) {
  var dfd = Q.defer();
  var filters = createFilters(options);
  var size = (typeof options.size === 'undefined')? 10: options.size;
  var from = (typeof options.from === 'undefined')? 0: options.from;
  var boundaryPathFilter = ejs.TermFilter('boundary_path.tree', options.parent_path);
  var pathFilter = ejs.TermFilter('path.tree', options.parent_path);
  var dataTypeFilter = ejs.TermFilter('node_type', 'data');
  var leafTypeFilter = ejs.TermFilter('node_type', 'leaf');
  var dataFilters = [];
  var leafFilters = [];
  var queryObjects = [];
  // Push filters
  dataFilters.push.apply(dataFilters, filters);
  dataFilters.push(boundaryPathFilter);
  dataFilters.push(dataTypeFilter);
  leafFilters.push.apply(leafFilters, filters);
  leafFilters.push(pathFilter);
  leafFilters.push(leafTypeFilter);
  // Construct data query object
  dataQueryObj = ejs.Request().query(
    ejs.FilteredQuery(
      ejs.QueryStringQuery(queryString),
      ejs.AndFilter(
        dataFilters
      )
    )
  )
  .agg(
    ejs.TermsAggregation('boundary')
      .field('boundary_path')
      .size(0)
      .agg(
        ejs.TopHitsAggregation('top')
          .size(3)
          .source([], ['__num*'])
      )
  )
  .size(0)
  .from(0)
  .source([], [])
  .toJSON();
  // Construct leaf query object
  leafQueryObj = ejs.Request().query(
    ejs.FilteredQuery(
      ejs.QueryStringQuery(queryString),
      ejs.AndFilter(
        leafFilters
      )
    )
  )
  .size(999999999)
  .from(0)
  .source([], ['*_suggest'])
  .toJSON();
  // Push query objects
  queryObjects.push({});
  queryObjects.push(dataQueryObj);
  queryObjects.push({});
  queryObjects.push(leafQueryObj);
  // Query ES

  console.log('data query obj', JSON.stringify(dataQueryObj));
  console.log('leaf query obj', JSON.stringify(leafQueryObj));
  client.msearch({
    index: 'kraken',
    body: queryObjects
  }, function (error, responses) {
    if (_.isEmpty(error)) {
      dfd.resolve(responses);
    } else {
      dfd.reject({error: error});
    }

  });
  return dfd.promise;
}

/**
* Constructs the ES query for searching for a leaf.
*
* @param {string} queryString - Query string
* @param {Object} options - Options used for the query
* @return {promise}
*/
exports.searchForLeaf = function(queryString, options) {

  var dfd = Q.defer();
  if(options.from > 0)
  {
    dfd.resolve({'hits': {'hits':[]}});
    return dfd.promise;
  }
  var pathFilter = ejs.TermFilter('path', options.leaf_path);
  var nodeTypeFilter = ejs.TermFilter('node_type', 'leaf');
  var filters = [];
  filters.push(pathFilter);
  filters.push(nodeTypeFilter);

  //console.log('searchForLeaf', options);
  //console.lo;
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
    ejs.TermsAggregation('node_types')
    .field('node_type')
    .size(0)
    .agg(
      ejs.TermsAggregation('tags')
      .field('tags')
      .size(0)
    )
    .agg(
      ejs.TermsAggregation('source_type')
      .field('source_type')
      .size(0)
    )
    .agg(
      ejs.TermsAggregation('data_granularity')
      .field('data_granularity')
      .size(0)
    )
    .agg(
      ejs.TermsAggregation('frequency')
      .field('frequency')
      .size(0)
    )
  )
  .source([], ['*_suggest', 'columns'])
  .toJSON();

  console.log(JSON.stringify(queryObj));

  client.search({
    index: 'kraken',
    body: queryObj
  }, function(error, response) {
    if (_.isEmpty(error)) {
      dfd.resolve(response);
    } else {
      dfd.reject({error: error});
    }
  });
  return dfd.promise;
}

/**
* Handles the creation of suggest queries
*
* @param {string} queryString - Query string
* @param {Object} suggestType - Type of suggestion
* @return {promise}
*/
exports.startSuggestion = function(queryString, suggestType) {
  var dfd = Q.defer();
  getSuggestions(queryString,suggestType)
  .then(function (response) {
    var options = response.suggester[0].options;
    dfd.resolve(options);
  })
  .catch(function (response) {
    dfd.reject({ error: response });
    console.log(arguments);
  });
  return dfd.promise;
}

exports.searchDDG = function(request,reply) {
  var dfd = Q.defer();
  var options = {
    "useragent": "My duckduckgo app",
    "no_redirects": "1",
    "no_html": "0",
    "format":"json"
  };
  var ddgResponse = {'ddg_data':''};
  ddg.query(request.params.queryString, options,function(err, data){
    //console.log(data);
    if (typeof error !== 'undefined') {
      ddgResponse.ddg_data = err;
      dfd.reject(ddgResponse);
    } else {
      var results = [];
      _.each(data.RelatedTopics, function (result) {
        if (_.isEmpty(result.Topics)) {
          results.push(result);
        } else {
          _.each(result.Topics, function(topic) {
            results.push(topic);
          });
        }
      });
      ddgResponse.ddg_data = {
        RelatedTopics: results
      };

      dfd.resolve(ddgResponse);
    }
  });
  return dfd.promise;
}

exports.processAgg = function(result, options){
  var result = ProcessAgg.process_agg(result, options);
  return result;
}

/* Based upon results, custom filters need to be disabled/removed/added and shown */
exports.includeCustomFilters = function(searchResponse,searchType){    
  var customFilters = {'tagsFilterDetails':[],'sourceTypeFilterDetails':[],'granularityFilterDetails':[],'frequencyFilterDetails':[],'state':false};
   //console.log('hits');
   searchResponse['includeFilterDetails'] = {};
  if(!searchType)
    searchType = 'normalsearch';

  switch(searchType){
    case 'normalsearch':
      var allHits = _.pluck(searchResponse.hits,'hits');
      _.each(allHits,function(hit) {
        var metadata = _.pluck(hit,'metadata');
        _.each(metadata, function(meta){
          //console.log('i am here',meta);
          customFilters.data_granularity[meta.data_granularity] = meta.data_granularity;
          //moment(meta.as_of,'YYYY-MM-DD').year();
          //console.log('dates',moment(meta.as_of,'YYYY-MM-DD').year());
          customFilters.as_of[moment(meta.as_of,'YYYY-MM-DD').year()] = moment(meta.as_of,'YYYY-MM-DD').year();
          customFilters.source_type[meta.source_type] = meta.source_type;
          customFilters.frequency[meta.frequency] = meta.frequency;
          customFilters.state = true;
        });
      });
    break;

    case 'searchForLeaf':
      console.log(searchResponse);
      var allHits = _.pluck(searchResponse.hits,'hits');
      _.each(allHits,function(hit) {
        var metadata = _.pluck(hit,'metadata');
        _.each(metadata, function(meta){
          //console.log('i am here',meta);          
          customFilters.granularityFilterDetails.push({'key':meta.data_granularity,'doc_count':1});
          customFilters.sourceTypeFilterDetails.push({'key':meta.source_type,'doc_count':1});
          customFilters.frequencyFilterDetails.push({'key':meta.frequency,'doc_count':1});
          //customFilters.granularityFilterDetails.push({'key':meta.data_granularity,'doc_count':1});
          _.each(meta.tags,function(tag){
            customFilters.tagsFilterDetails.push({'key':tag,'doc_count':1});
          });
          //moment(meta.as_of,'YYYY-MM-DD').year();
          //console.log('dates',moment(meta.as_of,'YYYY-MM-DD').year());
          //customFilters.as_of[moment(meta.as_of,'YYYY-MM-DD').year()] = moment(meta.as_of,'YYYY-MM-DD').year();
          //customFilters.source_type[meta.source_type] = meta.source_type;
          //customFilters.frequency[meta.frequency] = meta.frequency;
          customFilters.state = true;
        });
      }); 

    break;
  }

  searchResponse.includeFilterDetails = customFilters;
  searchResponse.includeFilterDetails['sourceTypeFilterDetails'].unshift({'key':'none','doc_count':'not_defined','info':{'key':'none','doc_count':'not_defined'}});
  searchResponse.includeFilterDetails['granularityFilterDetails'].unshift({'key':'none','doc_count':'not_defined','info':{'key':'none','doc_count':'not_defined'}});
  searchResponse.includeFilterDetails['frequencyFilterDetails'].unshift({'key':'none','doc_count':'not_defined','info':{'key':'none','doc_count':'not_defined'}});
  
  return searchResponse; 
}

exports.includeFilterDetails = function(response,searchResponse){

  var _this = this;

  console.log('search response',searchResponse.hits.length);
  console.log('search response',searchResponse.hits[0].hits.length);
  searchResponse['includeFilterDetails'] = {};

  searchResponse.includeFilterDetails['tagsFilterDetails'] = [];
  searchResponse.includeFilterDetails['sourceTypeFilterDetails'] = [];
  searchResponse.includeFilterDetails['granularityFilterDetails'] = [];
  searchResponse.includeFilterDetails['frequencyFilterDetails'] = [];

  searchResponse.includeFilterDetails['state'] = false;

  //searchResponse['testing'] = response.aggregations.aggs_filters.node_types.buckets;

  //return searchResponse;

  var uniqueEntries = [];

  if(!_.isEmpty(response.aggregations.aggs_filters.node_types.buckets)){
    console.log('i m here');
    var allTagsAggs = _.pluck(response.aggregations.aggs_filters.node_types.buckets,'tags');
    var allSourceTypes = _.pluck(response.aggregations.aggs_filters.node_types.buckets,'source_type');
    var allGrans = _.pluck(response.aggregations.aggs_filters.node_types.buckets,'data_granularity');
    var allFreq = _.pluck(response.aggregations.aggs_filters.node_types.buckets,'frequency');
    var uniqueEntries = _.pluck(response.aggregations.aggs_filters.node_types.buckets,'path');

    var state = false;

    _.each(allTagsAggs,function(tagsAgg){
      var tagsArr = _.map(tagsAgg.buckets, function(obj) { var item = _.pick(obj, 'key', 'doc_count'); item['info'] = _.pick(obj, 'key', 'doc_count'); return item;});
      searchResponse.includeFilterDetails['tagsFilterDetails'] = searchResponse.includeFilterDetails['tagsFilterDetails'].concat(tagsArr);
      state = true;
    });

    _.each(allSourceTypes,function(sourceTypeAgg){
      var sourceTypeAggArr = _.map(sourceTypeAgg.buckets, function(obj) { var item = _.pick(obj, 'key', 'doc_count'); item['info'] = _.pick(obj, 'key', 'doc_count'); return item; });
      searchResponse.includeFilterDetails['sourceTypeFilterDetails'] = searchResponse.includeFilterDetails['sourceTypeFilterDetails'].concat(sourceTypeAggArr);
      state = true;
    });

    _.each(allGrans,function(granAgg){
      var granAggArr = _.map(granAgg.buckets, function(obj) { var item = _.pick(obj, 'key', 'doc_count'); item['info'] = _.pick(obj, 'key', 'doc_count'); return item; });
      searchResponse.includeFilterDetails['granularityFilterDetails'] = searchResponse.includeFilterDetails['granularityFilterDetails'].concat(granAggArr);
      state = true;
    });

    _.each(allFreq,function(freqAgg){
      var freqAggArr = _.map(freqAgg.buckets, function(obj) { var item = _.pick(obj, 'key', 'doc_count'); item['info'] = _.pick(obj, 'key', 'doc_count'); return item; });
      searchResponse.includeFilterDetails['frequencyFilterDetails'] = searchResponse.includeFilterDetails['frequencyFilterDetails'].concat(freqAggArr);
      state = true;
    });

    //var allBoundary = _.pluck(response.aggregations.aggs_filters.node_types.buckets,'boundary');
    /*
    searchResponse.includeFilterDetails['sourceTypeFilterDetails'].unshift({'key':'none','doc_count':'not_defined','info':{'key':'none','doc_count':'not_defined'}});
    searchResponse.includeFilterDetails['granularityFilterDetails'].unshift({'key':'none','doc_count':'not_defined','info':{'key':'none','doc_count':'not_defined'}});
    searchResponse.includeFilterDetails['frequencyFilterDetails'].unshift({'key':'none','doc_count':'not_defined','info':{'key':'none','doc_count':'not_defined'}});
    

    searchResponse.includeFilterDetails['state'] = state;*/
  }

  
  if(!_.isEmpty(searchResponse.hits)) {
    var hitsArray = _.pluck(searchResponse.hits,'hits');
    hitsArray = hitsArray[0];
    console.log('i m here');
    console.log(hitsArray);
    if(!_.isEmpty(hitsArray)){
      /*var allTagsAggs = _.pluck(hitsArray,'metadata.tags');
      var allSourceTypes = _.pluck(hitsArray,'metadata.source_type');
      var allGrans = _.pluck(hitsArray,'metadata.data_granularity');
      var allFreq = _.pluck(hitsArray,'metadata.frequency');
      var allPaths = _.pluck(hitsArray,'path');
*/
      var allTagsAggs = _.pluck(hitsArray,'metadata');
      var allSourceTypes = allTagsAggs;
      var allGrans = allTagsAggs;
      var allFreq = allTagsAggs;
      var allPaths = _.pluck(hitsArray,'path');

      console.log(allPaths);
      //console.log(allTagsAggs);
      var state = false;
      var tagsArr = []; var tagsArrUnique = {};
      var sourceTypeAggArr = []; var sourceTypeUnique = {};
      var granAggArr = []; var granUnique = {};
      var freqAggArr = []; var freqUnique = {};

      _.each(allTagsAggs,function(tagsAgg,index){
        if(uniqueEntries.indexOf(allPaths[index]) === -1){         
          _.map(tagsAgg.tags,function(val){
            var count = 0;
            _.each(allTagsAggs, function(valArray){
              if(valArray.tags.indexOf(val) > -1)
                count = count + 1;
            });
            if(!tagsArrUnique[val.toLowerCase()] && count > 0){
              var item = {'key':val,'doc_count':count}; item['info'] = {'key':val,'doc_count':count};
              state = true;
              // Check for duplicates in existing filterDetailstags
              if(_this.checkDuplicatesInFilterDetails(searchResponse.includeFilterDetails['tagsFilterDetails'], val) === false)                     
                tagsArr.push(item);
              tagsArrUnique[val.toLowerCase()] = val;
            }
          });
        }        
      });


      //searchResponse.includeFilterDetails['tagsFilterDetails'] = searchResponse.includeFilterDetails['tagsFilterDetails'].concat(tagsArr);
      
      _.each(allSourceTypes,function(sourceTypeVal,index){
        var count = 0;
        if(uniqueEntries.indexOf(allPaths[index]) === -1){      
          _.map(allSourceTypes,function(val){
            if(val.source_type === sourceTypeVal.source_type)
              count = count + 1;        
            });
          if(!sourceTypeUnique[sourceTypeVal.source_type.toLowerCase()] && count > 0){
            var item = {'key':sourceTypeVal.source_type,'doc_count':count}; item['info'] = {'key':sourceTypeVal.source_type,'doc_count':count};
            state = true;
            if(_this.checkDuplicatesInFilterDetails(searchResponse.includeFilterDetails['sourceTypeFilterDetails'], sourceTypeVal.source_type) === false)
              sourceTypeAggArr.push(item);
            sourceTypeUnique[sourceTypeVal.source_type.toLowerCase()] = sourceTypeVal.source_type;
          }
          
        }
      });

      searchResponse.includeFilterDetails['sourceTypeFilterDetails'] = searchResponse.includeFilterDetails['sourceTypeFilterDetails'].concat(sourceTypeAggArr);

      _.each(allGrans,function(granAgg,index){
        var count = 0;
        if(uniqueEntries.indexOf(allPaths[index]) === -1){
          _.map(allGrans,function(val){
            if(val.data_granularity === granAgg.data_granularity)
              count = count + 1;
          });
          if(!granUnique[granAgg.data_granularity.toLowerCase()] && count > 0){
            var item = {'key':granAgg.data_granularity,'doc_count':count}; item['info'] = {'key':granAgg.data_granularity,'doc_count':count};
            state = true;
            if(_this.checkDuplicatesInFilterDetails(searchResponse.includeFilterDetails['granularityFilterDetails'], granAgg.data_granularity) === false)
              granAggArr.push(item);
            granUnique[granAgg.data_granularity.toLowerCase()] = granAgg.data_granularity;
          }
          
        }
      });
      
      searchResponse.includeFilterDetails['granularityFilterDetails'] = searchResponse.includeFilterDetails['granularityFilterDetails'].concat(granAggArr);
      
      _.each(allFreq,function(freqAgg,index){
        var count = 0;
        if(uniqueEntries.indexOf(allPaths[index]) === -1){
          _.map(allFreq,function(val){
            if(val.frequency === freqAgg.frequency)
              count = count + 1;
          });
          if(!freqUnique[freqAgg.frequency.toLowerCase()] && count > 0){
            var item = {'key':freqAgg.frequency,'doc_count':count}; item['info'] = {'key':freqAgg.frequency,'doc_count':count};
            state = true;
            if(_this.checkDuplicatesInFilterDetails(searchResponse.includeFilterDetails['frequencyFilterDetails'], freqAgg.frequency) === false)
              freqAggArr.push(item);
            freqUnique[freqAgg.frequency.toLowerCase()] = freqAgg.frequency;
          }          
        }
      });

      searchResponse.includeFilterDetails['frequencyFilterDetails'] = searchResponse.includeFilterDetails['frequencyFilterDetails'].concat(freqAggArr);
    }
    else
    console.log('including filters- something wrong');    
  }
  
  searchResponse.includeFilterDetails['sourceTypeFilterDetails'].unshift({'key':'none','doc_count':'not_defined','info':{'key':'none','doc_count':'not_defined'}});
  searchResponse.includeFilterDetails['granularityFilterDetails'].unshift({'key':'none','doc_count':'not_defined','info':{'key':'none','doc_count':'not_defined'}});
  searchResponse.includeFilterDetails['frequencyFilterDetails'].unshift({'key':'none','doc_count':'not_defined','info':{'key':'none','doc_count':'not_defined'}});
  

  searchResponse.includeFilterDetails['state'] = state;

  console.log('checking uniqueness');
  console.log(JSON.stringify(freqUnique));
  console.log('checking source type filters');
  console.log(JSON.stringify(searchResponse.includeFilterDetails['sourceTypeFilterDetails']));
  
  return searchResponse;

}

exports.checkDuplicatesInFilterDetails = function(objArray, value){
  var found = false;
  _.each(objArray, function(obj){
    if(obj.key.toLowerCase() === value.toLowerCase())
      found = true;
  });

  return found;
}
