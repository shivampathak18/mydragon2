var ejs = require('elastic.js'),
_ = require('underscore'),
Q = require('q');

var client = new elasticsearch.Client({
  host: 'http://128.199.230.203'
});

// exports.searchDise = function(query) {
//
//   var dfd = Q.defer();
//
//   dfd.resolve(query);
//   return dfd.promise;
// };
