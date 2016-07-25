var _ = require('underscore');

/**
 * Dao layer which actually gets auth from the datastore
 *
 * @type {exports}
 */

/**
 * @module  User
 * @description contain the details of Attribute
 */

//var Response = {};

var _this = this;

_this.rawResponse = {'searchdata':{},'collectiondata':{}};
_this.errorResponse = {};
_this.Response = {'hits':{},'collection_data':{}};

eventEmitter.on('search:defaultvalues',function(){
  _this.rawResponse = {'searchdata':{},'collectiondata':{}};
  _this.Response = {'hits':{},'collection_data':{}};
})

eventEmitter.on('search:searchdata',function(data){
  
  _this.rawResponse.searchdata = data;
});

eventEmitter.on('search:collectiondata',function(data){
  
  _this.rawResponse.collectiondata = data;
});

eventEmitter.on('search:error',function(data){
  
  _this.errorResponse.success = false;
  _this.errorResponse.error = data;
});

eventEmitter.on('search:sendreply',function(config,reply){

  if(_this.errorResponse.success === false)
    reply(_this.errorResponse);
  else
  {
    _this.Response.hits = _this.rawResponse.searchdata;
    _this.Response.collection_data = _this.rawResponse.collectiondata;
    reply(_this.Response);
  }
  
});



//_this.Response = {'hits':{},'aggs':{}};
/*
exports.createResponse = function(response) {
  // Hits
 // console.log(response);
  _this.addHits(response);
  // Aggs
  //_this.addAggs(response);
}

exports.addHits = function(response){
  
  var data = _.pluck(response.hits.hits,'_source')
  if(data)
  {
    _this.addHitsEntry(data);
  }
}

exports.addAggs = function(response){  
  
}

exports.initialize = function() {
  _this.Response = {'hits':[],'aggs':[],'hits_copy':{},'aggs_copy':{}};
}

exports.deleteEntry = function(key) {
  //user.remove(callback);
}

exports.addHitsEntry = function(dataArr){
  _this.Response['hits'] = dataArr;
}

exports.getValue = function(key) {
  return _this.Response['hits_copy'][key]
}

exports.sendReply = function(reply){
  reply(_this.Response);
}



exports.addUserScrollId = function(id){
  //console.log('adding new id',id);
  _this.Response['scrollId'] = id;
}
*/
