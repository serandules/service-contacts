var log = require('logger')('service-contacts');
var bodyParser = require('body-parser');

var auth = require('auth');
var throttle = require('throttle');
var serandi = require('serandi');
var model = require('model');
var Contacts = require('model-contacts');

var xactions = {
    post: {
        verify: require('./xactions/verify'),
        confirm: require('./xactions/confirm')
    }
};

module.exports = function (router, done) {
    router.use(serandi.many);
    router.use(serandi.ctx);
    router.use(auth({
        GET: [
            '^\/$',
            '^\/.*'
        ]
    }));
    router.use(throttle.apis('contacts'));
    router.use(bodyParser.json());

    router.post('/',
      serandi.json,
      serandi.create(Contacts),
      function (req, res, next) {
        model.create(req.ctx, function (err, location) {
            if (err) {
                return next(err);
            }
            res.locate(location.id).status(201).send(location);
        });
    });

    router.post('/:id',
      serandi.xactions(xactions.post),
      serandi.json,
      serandi.transit({
          workflow: 'model',
          model: Contacts
      }));

    router.get('/:id',
      serandi.findOne(Contacts),
      function (req, res, next) {
        model.findOne(req.ctx, function (err, location) {
            if (err) {
              return next(err);
            }
            res.send(location);
        });
    });

    router.put('/:id',
      serandi.json,
      serandi.update(Contacts),
      function (req, res, next) {
        model.update(req.ctx, function (err, location) {
          if (err) {
            return next(err);
          }
          res.locate(location.id).status(200).send(location);
        });
    });

    router.get('/',
      serandi.find(Contacts),
      function (req, res, next) {
        model.find(req.ctx, function (err, contacts, paging) {
            if (err) {
                return next(err);
            }
            res.many(contacts, paging);
        });
    });

    router.delete('/:id',
      serandi.remove(Contacts),
      function (req, res, next) {
        model.remove(req.ctx, function (err) {
        if (err) {
          return next(err);
        }
        res.status(204).end();
      });
    });

    done();
};

