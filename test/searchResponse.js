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

_this.Response = {};

eventEmitter.on('doorOpen',function(response,reply){
  response.source['aggs'] = 'sknskjnskj';
  console.log('executing events');
  reply(response);
});



//_this.Response = {'hits':{},'aggs':{}};
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

exports

exports.addUserScrollId = function(id){
  //console.log('adding new id',id);
  _this.Response['scrollId'] = id;
}
