var _ = require('underscore');
var Q = require('q');
var Hoek = require('hoek');
var moment = require('moment');


var create_parent = function(leaf){
  // Create a parent using metadata in leaf

  var desc = leaf['node_description'];

  var parent = desc.slice(desc.length - 2, desc.length - 1);

  if(_.isEmpty(parent)){
    // No parent node can be retrieved from leaf.
    return {
      'path' : leaf['boundary_path'],
      'label' : leaf['boundary_label'],
      'hits' : {}
    }
  }

  parent = parent[0];
  parent['hits'] = {};
  return parent;
}


var create_leaf = function(data){
  // Create a leaf using data
  var leaf = data;

  // Remove uneccessary fields
  delete leaf['node_description'];


  // Index columns field by internal name
  leaf['columns'] = _.indexBy(leaf['columns'], 'internal_name')

  leaf['hits'] = {};
  return leaf;
}

var applyFilters_leaf = function(data,options,type){

  var leaf = data;
  var data_granularity = options.region_level;
  var source_type = options.source_type;
  var asof_range = options.asof_range;
  //console.log(typeof );  
  var frequency = options.frequency;
  var tags = options.filterTags;
  var startDate, endDate;
  if(data_granularity && data_granularity != 'none'){
    if(leaf.metadata.data_granularity.toLowerCase() !== data_granularity.toLowerCase())
      return false;
  }      
  else if(frequency && frequency != 'none'){
    if(leaf.metadata.frequency.toLowerCase() !== frequency.toLowerCase())
      return false;
  }    
  else if(source_type &&  source_type != 'none'){
    if(leaf.metadata.source_type.toLowerCase() != source_type.toLowerCase())
      return false;
  }
  else if(tags && tags.length > 0){
    //console.log(tags);
    //console.log(leaf.metadata.tags);
    var matchTags = _.map(leaf.metadata.tags,function(val){
      return val.toLowerCase();
    });

    var match = false;
    _.each(tags,function(tag){
      if(matchTags.indexOf(tag.toLowerCase()) > -1)
        match = true;
    });
    if(!match)
      return false;
  }    
  else if(!_.isEmpty(asof_range))
  {
    //console.log(asof_range['0']);
    if(Object.keys(asof_range).length == 2){
      startDate = moment(asof_range['0'],'YYYY').year();
      endDate = moment(asof_range['1'],'YYYY').year();
      console.log(startDate);
      console.log(endDate);
      var leaf_date = moment(leaf.metadata.as_of,'YYYY-MM-DD').year();
      if(leaf_date >= startDate && leaf_date <= endDate){
        // DO nothing
      }
      else
        return false;
    }
    else
      return true;
  }
  else
    return true;  
}


exports.process_agg = function(result, options){
  var st = new Date();
  //console.log(result);
  // Initialize aliases to defaults
  if(_.isEmpty(options.aliases.node_types)){
    node_types = "node_types";
  }

  if(_.isEmpty(options.aliases.boundary)){
    boundary = "boundary";
  }

  if(_.isEmpty(options.aliases.top)){
    top = "top";
  }

  var originalResult = result;
  var result = {};

  if(!(_.isEmpty(originalResult['aggregations']['aggs_filters'][node_types]['buckets']))){
    var buckets = originalResult['aggregations']['aggs_filters'][node_types]['buckets'];

    buckets = _.indexBy(buckets, 'key');
    _.each(['parent', 'leaf', 'data'], function(bucket_name){

      var bucket = buckets[bucket_name];

      if(_.isEmpty(bucket) || _.isEmpty(bucket[boundary]['buckets'])){
        //console.log('empty bucket',bucket_name);
        return;
      }

      var items_to_remove = [];
      // Process boundary aggs for each bucket
      _.each(bucket[boundary]['buckets'], function(boundary_bucket,index){
        if(_.isEmpty(boundary_bucket[top]['hits']['hits'])){          
          return;
        }

        
        // Hits present
        top_hits = boundary_bucket[top]['hits']['hits'];

        // A representative hit tha can be used as proxy for all hits
        // in this bucket wrt immediate parent's metadata
        //console.log('getting top hits',top_hits.length);
        hit = top_hits[0];

        if(bucket_name === 'leaf'){
          // This is a leaf hit,''
          
          ///else{}
          var parent_path = hit['_source']['boundary_path'];
          if(_.isEmpty(result[parent_path])){           
            result[parent_path] = create_parent(hit['_source']);
          }

          //console.log('after creating parent for hit',result);
          // Index top hits by path.
          var top_hits_i = {};
          _.each(top_hits, function(th){
            var check = applyFilters_leaf({'metadata':th['_source']['metadata']},options,'leaf');            
            if(check === false){              
              //items_to_remove.push(index);
              return;
            }                     
            var leaf = create_leaf(th['_source']);
            top_hits_i[th['_source']['path']] = leaf;           
          });

          //console.log('top_hits_i',top_hits_i);
          
          Hoek.merge(result[parent_path]['hits'], top_hits_i);
        }

        else if(bucket_name === 'data'){

          // Parse __metadata__
          hit['_source']['__metadata__'] =
          JSON.parse(hit['_source']['__metadata__']);

          delete hit['_source']['__metadata__']['columns'];

          var leaf_metadata = hit['_source']['__metadata__'];
          var parent_path = leaf_metadata['boundary_path'];
          var leaf_path = hit['_source']['boundary_path'];
          
          var check = applyFilters_leaf(leaf_metadata,options,'data');          
          if(check === false){            
            return;
          }
          // Create parent if required
          if(_.isEmpty(result[parent_path])){            
            result[parent_path] = create_parent(leaf_metadata);
          }

          // Create leaf if required
          if(_.isEmpty(result[parent_path][leaf_path])){            
            result[parent_path]['hits'][leaf_path] = create_leaf(
              leaf_metadata
            );
          }

          // Index by _id
          var top_hits_i = {};
          _.each(top_hits, function(th){
            var id = th['_id'];

            // Remove internal fields
            delete th['_source']['__metadata__'];
            delete th['_source']['boundary_path'];
            delete th['_source']['node_type'];
            top_hits_i[id] = th['_source'];
          })

          // Merge data hits into leaf's hits
          Hoek.merge(result[parent_path]['hits'][leaf_path]['hits'],
          top_hits_i);

        }
        else if(bucket_name === 'parent'){
          var check = applyFilters_leaf(hit['_source'],options);
          if(check === false)
          {
            console.log('not adding parent in data bucket');
            return;
          }

          var path = hit['_source']['path'];

          //console.log('parent hit');
          //console.log(hit['_source']);

          if(_.isEmpty(result[path])){
            // Create parent if required
            var node = hit['_source']['current_node'];
            node['hits'] = {};
            result[path] = node;
          }
        }

      });
    });

    // Flattening hits. Make recursive?
    result = _.map(result, function(r){
      console.log(r['hits']);
      if(_.isEmpty(r['hits']))
        return null;
      r['hits'] = _.map(r['hits'], function(rh){
        rh['hits'] = _.map(rh['hits'], function(rhh){
          return rhh;
        })
        return rh;
      })
      r['hits'] = r['hits'].slice(0, 2);
      return r;
    });

    result = _.filter(result,function(x){
      return x != null;
    });

  } else {
    console.log("um");
  }

  console.log('slicing number results',result.slice(options.from, options.from+10).length);

  result = {
    _debug: {
      took: originalResult.took,
      aggTime: (new Date() - st),
      total_length: _.isEmpty(result)? 0: result.length
    },
    //hits: _.isEmpty(result)? []: result.slice(options.from, options.from+10)
    hits: _.isEmpty(result)? []: result.slice(options.from, options.from+10)
  };

  

  result.didYouMean = '';
  _.each(originalResult.suggest['my-suggestion'], function (suggestion) {
    if (_.isEmpty(suggestion.options)) {
      result.didYouMean = result.didYouMean +
      ' ' +
      suggestion.text;
    } else {
      result.didYouMean = result.didYouMean +
      ' ' +
      suggestion.options[0].text;
    }
  });
  result.didYouMean = result.didYouMean.trim();

  return result;
}
