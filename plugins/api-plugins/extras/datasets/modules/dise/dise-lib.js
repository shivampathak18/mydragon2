var ejs = require('elastic.js'),
_ = require('underscore'),
Q = require('q');
var elasticsearch = require('elasticsearch');

var client = new elasticsearch.Client({
  host: 'http://localhost:9200'
});
exports.searchDise = function (query, options) {

  if (typeof options.state_code !== 'undefined') {
    query = 'state_code:' + options.state_code + ' ' + query;
  }
  var dfd = Q.defer(),
    queryObj = ejs.Request()
    .query(
      ejs.QueryStringQuery(query)
    )
    .size(typeof options.length === 'undefined'? 10: options.length)
    .from(typeof options.start === 'undefined'? 1: options.start)
    .toJSON();

  client.search({
    index: 'dise',
    body: queryObj
  }, function (error, response) {
    if (typeof error !== 'undefined') {
      // console.log(err);
      dfd.reject({ error: err });
    } else {
      dfd.resolve(_.pluck(response.hits.hits, '_source'));
    }
  });

  // dfd.resolve(query);
  return dfd.promise;
}
