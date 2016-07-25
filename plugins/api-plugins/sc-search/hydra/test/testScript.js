var Lab = require('lab'),
server = require('../../../../../index'),
Code = require('code');


var lab = exports.lab = Lab.script();


lab.experiment('search', function () {

    lab.test('Simple search query.', function (done) {
      var options = {
        method: 'GET',
        url: '/api/v0/search/query/education'
      };

      server.inject(options, function (response) {
        var result = response.result;

        Code.expect(response.statusCode).to.equal(200);

        done();
      });
    });

    lab.test('Search query with AND, OR tags and size params', function (done) {
      var options = {
        method: 'GET',
        url: '/api/v0/search/query/education?or=["kerala", "karnataka"]&'+
        'and=["dise"]&size=10'
      };

      server.inject(options, function (response) {
        var result = response.result;

        Code.expect(response.statusCode).to.equal(200);

        done();
      });
    });

    lab.test('Search query with asof_range, frequency, source_type and region_level filtering params', function (done) {
      var options = {
        method: 'GET',
        url: '/api/v0/search/query/education?asof_range=["2010", "2014"]&'+
        'frequency=Annual&source_type=Governmental&region_level=District Level'
      };

      server.inject(options, function (response) {
        var result = response.result;

        Code.expect(response.statusCode).to.equal(200);

        done();
      });
    });
});

lab.experiment('browse', function () {

  lab.test('Simple browse query.', function (done) {
    var options = {
      method: 'GET',
      url: '/api/v0/browse/sc/in/gov'
    };

    server.inject(options, function (response) {
      var result = response.result;

      Code.expect(response.statusCode).to.equal(200);

      done();
    });
  });

  lab.test('Browse by category.', function (done) {
    var options = {
      method: 'GET',
      url: '/api/v0/browse/sc/in/gov?category=["education"]'
    };

    server.inject(options, function (response) {
      var result = response.result;

      Code.expect(response.statusCode).to.equal(200);

      done();
    });
  });

  lab.test('Browse by category.', function (done) {
    var options = {
      method: 'GET',
      url: '/api/v0/browse/category?categories=["education", "government spending"]'
    };

    server.inject(options, function (response) {
      var result = response.result;

      Code.expect(response.statusCode).to.equal(200);

      done();
    });
  });
});

lab.experiment('count', function () {

  lab.test('Get counts of a path that exists.', function (done) {
    var options = {
      method: 'GET',
      url: '/api/v0/path/count/in/gov'
    };

    server.inject(options, function (response) {
      var result = response.result;

      Code.expect(response.statusCode).to.equal(200);

      done();
    });
  });

  lab.test('Get counts of a path that does not exist.', function (done) {
    var options = {
      method: 'GET',
      url: '/api/v0/path/count/us/gov'
    };

    server.inject(options, function (response) {
      var result = response.result;

      Code.expect(response.statusCode).to.equal(200);

      done();
    });
  });

  lab.test('Get counts of multiple paths.', function (done) {
    var options = {
      method: 'GET',
      url: '/api/v0/path/mcount?paths=["in", "us"]'
    };

    server.inject(options, function (response) {
      var result = response.result;

      Code.expect(response.statusCode).to.equal(200);

      done();
    });
  });
});

lab.experiment('categories', function () {

  lab.test('Get counts of all categories present.', function (done) {
    var options = {
      method: 'GET',
      url: '/api/v0/categories'
    };

    server.inject(options, function (response) {
      var result = response.result;

      Code.expect(response.statusCode).to.equal(200);

      done();
    });
  });
});

lab.experiment('data', function () {

  lab.test('Straightforward data preview', function (done) {
    var options = {
      method: 'GET',
      url: '/api/v0/data/in/gov/nuepa/dise/2014/ch?size=1'
    };

    server.inject(options, function (response) {
      var result = response.result;

      Code.expect(response.statusCode).to.equal(200);

      done();
    });
  });
});
