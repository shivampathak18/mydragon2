'use strict';

var Lab = require('lab'),
  Code = require('code'),
  Hapi = require('hapi'),
  server = require('../index');

  var lab = Lab.script(),
  token;

  lab.experiment('login', function() {

    lab.test('With an invalid string as username', function (done) {
      var options = {
        method: 'POST',
        url: '/login',
        payload: {
          username: '@#$%^ ../',
          password: 'olamoifriend'
        }
      };

      server.inject(options, function (response) {
        var result = response.result;

        Code.expect(response.statusCode).to.equal(401);

        done();
      });
    });

    lab.test('With an invalid username', function (done) {
      var options = {
        method: 'POST',
        url: '/login',
        payload: {
          username: 'randomuserthatdoesnotexist',
          password: 'olamoifriend'
        }
      };

      server.inject(options, function (response) {
        var result = response.result;

        Code.expect(response.statusCode).to.equal(401);

        done();
      });
    });

    lab.test('As a valid user (vaishaks) with a wrong password.', function (done) {
      var options = {
        method: 'POST',
        url: '/login',
        payload: {
          username: 'vaishaks',
          password: 'olamoifriend'
        }
      };

      server.inject(options, function (response) {
        var result = response.result;

        Code.expect(response.statusCode).to.equal(401);

        done();
      });
    });

    lab.test('As a valid user (vaishaks).', function (done) {
      var options = {
        method: 'POST',
        url: '/login',
        payload: {
          username: 'vaishaks',
          password: 'hellohello'
        }
      };

      server.inject(options, function (response) {
        var result = response.result;
        token = result.token;

        Code.expect(response.statusCode).to.equal(200);

        done();
      });
    });
  });
  lab.experiment('token', function() {

    lab.test('Request for a new token with a random string.', function (done) {
      var options = {
        method: 'POST',
        url: '/token',
        payload: {
          token: 'invalidtoken'
        }
      };

      server.inject(options, function (response) {
        var result = response.result;

        Code.expect(response.statusCode).to.equal(401);

        done();
      });
    });

    lab.test('Request for a new token with an invalid token i.e. user does not exit',
    function (done) {
      var options = {
        method: 'POST',
        url: '/token',
        payload: {
          token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1aWQiOiJpbnZhbGlkI'+
          'iwianRpIjoiNTUwYTc1OTEzZjA4ZTI4ZjEyMDk3OTZmIiwiaWF0IjoxNDI2NzQ4OD'+
          'E3LCJleHAiOjE0MjY3NDg4NTJ9._k9P8e6xqMaJWkOqoqGu0sKwSWY80g0'+
          '2CeFWZGAlFn8'
        }
      };

      server.inject(options, function (response) {
        var result = response.result;

        Code.expect(response.statusCode).to.equal(401);

        done();
      });
    });

    lab.test('Request for a new token with a valid token.', function (done) {
      var options = {
        method: 'POST',
        url: '/token',
        payload: {
          token: token
        }
      };

      server.inject(options, function (response) {
        var result = response.result;
        token = result.token;

        Code.expect(response.statusCode).to.equal(200);

        done();
      });
    });
  });

  lab.experiment('heartbeat', function() {

    lab.test('Check for heartbeat with a random string as token.', function (done) {
      var options = {
        method: 'GET',
        url: '/heartbeat',
        headers: {
          'Authorization': 'Bearer ' + 'invalidtoken.sasdfsa.adfs'
        }
      };

      server.inject(options, function (response) {
        var result = response.result;

        Code.expect(response.statusCode).to.equal(401);

        done();
      });
    });

    lab.test('Check for heartbeat with an invalid token i.e. user does not exit.',
    function (done) {
      var options = {
        method: 'GET',
        url: '/heartbeat',
        headers: {
          'Authorization': 'Bearer ' +
          'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1aiOiJpbnZhbGlkI'+
          'iwianRpIjoiNTUwYTc1OTEzZjA4ZTI4ZjEyMDk3OTZmIiwiaWF0IjoxNDI2NzQ4OD'+
          'E3LCJleHAiOjE0MjY3NDg4NTJ9._k9P8e6xqMaJWkOqoqGu0sKwSWY80g0'+
          '2CeFWZGAlFn8'
        }
      };

      server.inject(options, function (response) {
        var result = response.result;

        Code.expect(response.statusCode).to.equal(401);

        done();
      });
    });

    lab.test('Check for heartbeat with a valid token.', function (done) {
      var options = {
        method: 'GET',
        url: '/heartbeat',
        headers: {
          'Authorization': 'Bearer ' + token
        }
      };

      server.inject(options, function (response) {
        var result = response.result;
        token = result.token;

        Code.expect(response.statusCode).to.equal(200);

        done();
      });
    });
  });

exports.lab = lab;
