var pot = require('pot');

var domain = 'apis';
var model = 'contacts';

pot.throttlit(domain, 'contacts', {
  apis: {
    confirm: {
      second: 0,
      day: 1,
      month: 2
    },
    verify: {
      second: 0,
      day: 1,
      month: 2
    }
  },
  ips: {
    confirm: {
      second: 0,
      minute: 1,
      hour: 2,
      day: 3
    },
    verify: {
      second: 0,
      minute: 1,
      hour: 2,
      day: 3
    }
  }
}, {
  confirm: {
    POST: function (i) {
      return {
        url: pot.resolve(domain, '/v/' + model + '/dummy'),
        headers: {
          'X-Action': 'confirm'
        }
      }
    }
  },
  verify: {
    POST: function (i) {
      return {
        url: pot.resolve(domain, '/v/' + model + '/dummy'),
        headers: {
          'X-Action': 'verify'
        }
      }
    }
  }
});
