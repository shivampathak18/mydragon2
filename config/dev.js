module.exports = {
  server: {
    host: '0.0.0.0',
    port: 8080
  },
  database: {
    host: '127.0.0.1',
    port: 27017,
    db: 'socialcops',
    username: '',
    password: ''
  },
  elasticsearch: {
    host: 'http://128.199.79.88'
  },
  keys: {
    privateKey: 'eYpt8pZQS5pxJJ6841970c86PlgPY4Si'
  },
  time: {
    tokenExpirationSeconds: 2592000
  },
  constants: {
    authorization_roles: {
      FULL: 'full'
    }
  },

  "sc-db": {
    mongo_uri: "mongodb://127.0.0.1/socialcops"
  }


};
