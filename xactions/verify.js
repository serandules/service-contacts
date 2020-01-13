var async = require('async');
var fs = require('fs');
var path = require('path');
var dust = require('dustjs-linkedin');
var util = require('util');
var utils = require('utils');
var errors = require('errors');
var serandi = require('serandi');
var messenger = require('messenger');
var model = require('model');
var validators = require('validators');
var types = validators.types;
var Contacts = require('model-contacts');
var Otps = require('model-otps');

var sns = utils.sns();

var template = function (name) {
  var data = fs.readFileSync(path.join(__dirname, '..', 'templates', name + '.html'));
  dust.loadSource(dust.compile(String(data), 'service-contacts-' + name));
};

template('verify');

var verifyEmail = function (user, contact, done) {
  var email = contact.email;
  if (!contact.email) {
    return done();
  }
  if (contact._ && contact._.verified && contact._.verified.email) {
    return done();
  }
  types.email({
    field: 'email'
  })({value: email}, function (err) {
    if (err) {
      return done(err);
    }
    Otps.remove({
      user: user.id,
      name: 'contacts-verify',
      for: email
    }, function (err) {
      if (err) {
        return done(err);
      }
      model.create({
        user: user,
        model: Otps,
        data: {
          name: 'contacts-verify',
          for: email
        },
        overrides: {}
      }, function (err, otp) {
        if (err) {
          return done(err);
        }
        var ctx = {
          user: user,
          title: 'Verify your email',
          reset: utils.resolve(util.format('accounts:///verify?user=%s&email=%s&otp=%s', user.id, email, otp.strong))
        };
        dust.render('service-contacts-verify', ctx, function (err, html) {
          if (err) {
            return done(err);
          }
          messenger.email({
            from: 'Serandives <no-reply@serandives.com>',
            to: email,
            subject: ctx.title,
            html: html,
            text: html
          }, done);
        });
      });
    });
  });
};

var verifyPhone = function (user, contact, done) {
  var phone = contact.phone;
  if (!contact.phone) {
    return done();
  }
  if (contact._ && contact._.verified && contact._.verified.phone) {
    return done();
  }
  types.phone({
    field: 'phone'
  })({value: phone}, function (err) {
    if (err) {
      return done(err);
    }
    Otps.remove({
      user: user.id,
      name: 'contacts-verify',
      for: phone
    }, function (err) {
      if (err) {
        return done(err);
      }
      model.create({
        user: user,
        model: Otps,
        data: {
          name: 'contacts-verify',
          for: phone
        },
        overrides: {}
      }, function (err, otp) {
        if (err) {
          return done(err);
        }
        sns.checkIfPhoneNumberIsOptedOut({
          phoneNumber: phone
        }, function (err, data) {
          if (err) {
            return done(err);
          }
          if (data.isOptedOut) {
            return done(errors.forbidden());
          }
          sns.publish({
            PhoneNumber: phone,
            Message: util.format('%s is your %s verification code.', otp.weak, utils.domain())
          }, done);
        });
      });
    });
  });
};


module.exports = function (route) {
  route.use(serandi.json);
  route.use(serandi.captcha);

  route.use(serandi.findOne(Contacts));

  route.use(function (req, res, next) {
    model.findOne(req.ctx, function (err, contact) {
      if (err) {
        return next(err);
      }
      if (!contact) {
        return next(errors.notFound());
      }
      verifyEmail(req.user, contact, function (err) {
        if (err) {
          return next(err);
        }
        verifyPhone(req.user, contact, function (err) {
          if (err) {
            return next(err);
          }
          res.status(204).end();
        });
      });
    });
  });
};
