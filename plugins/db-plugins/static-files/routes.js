var routes = [
  {
    path: '/files',
    method: 'GET',
    handler: function() {
      console.log(arguments)
    },
    config: {

    }
  }
]

module.exports = routes