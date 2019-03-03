var log = require('logger')('service-contacts:test:create');
var errors = require('errors');
var _ = require('lodash');
var should = require('should');
var request = require('request');
var pot = require('pot');

describe('POST /contacts', function () {
    var client;
    before(function (done) {
        pot.client(function (err, c) {
            if (err) {
                return done(err);
            }
            client = c;
            done();
        });
    });

    var data = {
        name: 'Primary',
        email: 'user@serandives.com',
        phones: ['+94000000000'],
        viber: '+94000000000',
        whatsapp: '+94000000000',
        messenger: 'user-serandives',
        skype: 'user-serandives'
    };

    var without = function (without) {
        var clone = _.cloneDeep(data);
        without = without || [];
        without.forEach(function (w) {
            delete clone[w];
        });
        return clone;
    };

    var invalid = function (name, value) {
        var clone = _.cloneDeep(data);
        clone[name] = value;
        return clone;
    };

    it('with no media type', function (done) {
        request({
            uri: pot.resolve('accounts', '/apis/v/contacts'),
            method: 'POST',
            auth: {
                bearer: client.users[0].token
            }
        }, function (e, r, b) {
            if (e) {
                return done(e);
            }
            r.statusCode.should.equal(errors.unsupportedMedia().status);
            should.exist(b);
            b = JSON.parse(b);
            should.exist(b.code);
            should.exist(b.message);
            b.code.should.equal(errors.unsupportedMedia().data.code);
            done();
        });
    });

    it('with unsupported media type', function (done) {
        request({
            uri: pot.resolve('accounts', '/apis/v/contacts'),
            method: 'POST',
            headers: {
                'Content-Type': 'application/xml'
            },
            auth: {
                bearer: client.users[0].token
            }
        }, function (e, r, b) {
            if (e) {
                return done(e);
            }
            r.statusCode.should.equal(errors.unsupportedMedia().status);
            should.exist(b);
            b = JSON.parse(b);
            should.exist(b.code);
            should.exist(b.message);
            b.code.should.equal(errors.unsupportedMedia().data.code);
            done();
        });
    });

    it('without name', function (done) {
      request({
        uri: pot.resolve('accounts', '/apis/v/contacts'),
        method: 'POST',
        json: without(['name']),
        auth: {
          bearer: client.users[0].token
        }
      }, function (e, r, b) {
        if (e) {
          return done(e);
        }
        r.statusCode.should.equal(errors.unprocessableEntity().status);
        should.exist(b);
        should.exist(b.code);
        should.exist(b.message);
        b.code.should.equal(errors.unprocessableEntity().data.code);
        done();
      });
    });

    it('without any', function (done) {
      request({
        uri: pot.resolve('accounts', '/apis/v/contacts'),
        method: 'POST',
        json: {
          name: 'primary'
        },
        auth: {
          bearer: client.users[0].token
        }
      }, function (e, r, b) {
        if (e) {
          return done(e);
        }
        r.statusCode.should.equal(errors.unprocessableEntity().status);
        should.exist(b);
        should.exist(b.code);
        should.exist(b.message);
        b.code.should.equal(errors.unprocessableEntity().data.code);
        done();
      });
    });

    var bigger = '';
    var i;
    for (i = 0; i < 500; i++) {
        bigger += 'x';
    }
    var invalidFields = {
        name: [bigger],
        phones: [bigger],
        email: [bigger],
        viber: [bigger],
        whatsapp: [bigger],
        messenger: [bigger],
        skype: [bigger]
    };

    Object.keys(invalidFields).forEach(function (field) {
        var values = invalidFields[field];
        values.forEach(function (value, i) {
            it('invalid ' + field + ' with value ' + i, function (done) {
                request({
                    uri: pot.resolve('accounts', '/apis/v/contacts'),
                    method: 'POST',
                    json: invalid(field, value),
                    auth: {
                        bearer: client.users[0].token
                    }
                }, function (e, r, b) {
                    if (e) {
                        return done(e);
                    }
                    r.statusCode.should.equal(errors.unprocessableEntity().status);
                    should.exist(b);
                    should.exist(b.code);
                    should.exist(b.message);
                    b.code.should.equal(errors.unprocessableEntity().data.code);
                    done();
                });
            });
        });
    });

    it('valid', function (done) {
        request({
            uri: pot.resolve('accounts', '/apis/v/contacts'),
            method: 'POST',
            json: data,
            auth: {
                bearer: client.users[0].token
            }
        }, function (e, r, b) {
            if (e) {
                return done(e);
            }
            r.statusCode.should.equal(201);
            should.exist(b);
            should.exist(b.viber);
            b.viber.should.equal(data.viber);
            should.exist(r.headers['location']);
            r.headers['location'].should.equal(pot.resolve('accounts', '/apis/v/contacts/' + b.id));
            done();
        });
    });
});
