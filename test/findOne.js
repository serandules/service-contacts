var log = require('logger')('service-contacts:test:find');
var mongoose = require('mongoose');
var async = require('async');
var errors = require('errors');
var _ = require('lodash');
var should = require('should');
var request = require('request');
var pot = require('pot');

describe('GET /contacts', function () {
    var client;
    var groups;
    var userEmail = 'test@serandives.com';

    before(function (done) {
        pot.drop('contacts', function (err) {
            if (err) {
                return done(err);
            }
            pot.client(function (err, c) {
                if (err) {
                    return done(err);
                }
                client = c;
                pot.groups(function (err, g) {
                    if (err) {
                        return done(err);
                    }
                    groups = g;
                    createContacts(client.users[0], 1, function (err) {
                        if (err) {
                            return done(err);
                        }
                        createContacts(client.users[1], 1, done);
                    });
                });
            });
        });
    });

    var contact = {
        name: 'Primary',
        email: userEmail,
        phone: '+94775493444',
        messenger: 'user-serandives',
        skype: 'user-serandives'
    };

    var validateContacts = function (contacts) {
        contacts.forEach(function (contact) {
            should.exist(contact.id);
            should.exist(contact.user);
            should.exist(contact.createdAt);
            should.exist(contact.modifiedAt);
            should.not.exist(contact._id);
            should.not.exist(contact.__v);
        });
    };

    var payload = function (without) {
        var clone = _.cloneDeep(contact);
        without = without || [];
        without.forEach(function (w) {
            delete clone[w];
        });
        return clone;
    };

    var createContacts = function (user, count, done) {
        async.whilst(function () {
            return count-- > 0
        }, function (created) {
            var contact = payload();
            contact.viber = 'viber' + count;
            request({
                uri: pot.resolve('accounts', '/apis/v/contacts'),
                method: 'POST',
                auth: {
                    bearer: user.token
                },
                json: contact
            }, function (e, r, b) {
                if (e) {
                    return created(e);
                }
                r.statusCode.should.equal(201);
                should.exist(b);
                should.exist(b.id);
                should.exist(b.email);
                b.email.should.equal(userEmail);
                should.exist(r.headers['location']);
                r.headers['location'].should.equal(pot.resolve('accounts', '/apis/v/contacts/' + b.id));
                created();
            });
        }, done);
    };

    it('invalid id', function (done) {
        request({
            uri: pot.resolve('accounts', '/apis/v/contacts/undefined'),
            method: 'GET',
            auth: {
                bearer: client.users[0].token
            },
            json: true
        }, function (e, r, b) {
            if (e) {
                return done(e);
            }
            r.statusCode.should.equal(errors.notFound().status);
            should.exist(b);
            should.exist(b.code);
            should.exist(b.message);
            b.code.should.equal(errors.notFound().data.code);
            done();
        });
    });

    it('owner can access', function (done) {
        request({
            uri: pot.resolve('accounts', '/apis/v/contacts'),
            method: 'GET',
            auth: {
                bearer: client.users[0].token
            },
            json: true
        }, function (e, r, b) {
            if (e) {
                return done(e);
            }
            r.statusCode.should.equal(200);
            should.exist(b);
            should.exist(b.length);
            b.length.should.equal(1);
            validateContacts(b);
            request({
                uri: pot.resolve('accounts', '/apis/v/contacts/' + b[0].id),
                method: 'GET',
                auth: {
                    bearer: client.users[0].token
                },
                json: true
            }, function (e, r, b) {
                if (e) {
                    return done(e);
                }
                r.statusCode.should.equal(200);
                should.exist(b);
                validateContacts([b]);
                done();
            });
        });
    });

    it('others cannot access', function (done) {
        request({
            uri: pot.resolve('accounts', '/apis/v/contacts'),
            method: 'GET',
            auth: {
                bearer: client.users[0].token
            },
            json: true
        }, function (e, r, b) {
            if (e) {
                return done(e);
            }
            r.statusCode.should.equal(200);
            should.exist(b);
            should.exist(b.length);
            b.length.should.equal(1);
            validateContacts(b);
            request({
                uri: pot.resolve('accounts', '/apis/v/contacts/' + b[0].id),
                method: 'GET',
                auth: {
                    bearer: client.users[1].token
                },
                json: true
            }, function (e, r, b) {
                if (e) {
                    return done(e);
                }
                r.statusCode.should.equal(errors.notFound().status);
                should.exist(b);
                should.exist(b.code);
                should.exist(b.message);
                b.code.should.equal(errors.notFound().data.code);
                done();
            });
        });
    });

    it('can be accessed by anyone when public', function (done) {
        request({
            uri: pot.resolve('accounts', '/apis/v/contacts'),
            method: 'GET',
            auth: {
                bearer: client.users[0].token
            },
            json: true
        }, function (e, r, b) {
            if (e) {
                return done(e);
            }
            r.statusCode.should.equal(200);
            should.exist(b);
            should.exist(b.length);
            b.length.should.equal(1);
            validateContacts(b);
            var contact = b[0];
            request({
                uri: pot.resolve('accounts', '/apis/v/contacts/' + contact.id),
                method: 'GET',
                auth: {
                    bearer: client.users[1].token
                },
                json: true
            }, function (e, r, b) {
                if (e) {
                    return done(e);
                }
                r.statusCode.should.equal(errors.notFound().status);
                should.exist(b);
                should.exist(b.code);
                should.exist(b.message);
                b.code.should.equal(errors.notFound().data.code);
                request({
                    uri: pot.resolve('accounts', '/apis/v/contacts/' + contact.id),
                    method: 'GET',
                    auth: {
                        bearer: client.users[1].token
                    },
                    json: true
                }, function (e, r, b) {
                    if (e) {
                        return done(e);
                    }
                    r.statusCode.should.equal(errors.notFound().status);
                    should.exist(b);
                    should.exist(b.code);
                    should.exist(b.message);
                    b.code.should.equal(errors.notFound().data.code);
                    request({
                        uri: pot.resolve('accounts', '/apis/v/contacts/' + contact.id),
                        method: 'POST',
                        headers: {
                            'X-Action': 'verify',
                            'X-Captcha': 'dummy'
                        },
                        auth: {
                            bearer: client.users[0].token
                        },
                        json: {
                            email: true
                        }
                    }, function (e, r, b) {
                        if (e) {
                            return done(e);
                        }
                        r.statusCode.should.equal(204);
                        var Otps = mongoose.model('otps');
                        Otps.findOne({
                            user: client.users[0].profile.id,
                            name: 'contacts-verify',
                            for: contact.email
                        }, function (err, otpEmail) {
                            if (err) {
                                return done(err);
                            }
                            Otps.findOne({
                                user: client.users[0].profile.id,
                                name: 'contacts-verify',
                                for: contact.email
                            }, function (err, otpPhone) {
                                if (err) {
                                    return done(err);
                                }
                                request({
                                    uri: pot.resolve('accounts', '/apis/v/contacts/' + contact.id),
                                    method: 'POST',
                                    headers: {
                                        'X-Action': 'confirm',
                                        'X-Captcha': 'dummy'
                                    },
                                    auth: {
                                        bearer: client.users[0].token
                                    },
                                    json: {
                                        email: otpEmail.weak,
                                        phone: otpPhone.weak
                                    }
                                }, function (e, r, b) {
                                    if (e) {
                                        return done(e);
                                    }
                                    r.statusCode.should.equal(204);
                                    pot.publish('accounts', 'contacts', contact.id, client.users[0].token, client.admin.token, function (err) {
                                        if (err) {
                                            return done(err);
                                        }
                                        request({
                                            uri: pot.resolve('accounts', '/apis/v/contacts/' + contact.id),
                                            method: 'GET',
                                            auth: {
                                                bearer: client.users[1].token
                                            },
                                            json: true
                                        }, function (e, r, b) {
                                            if (e) {
                                                return done(e);
                                            }
                                            r.statusCode.should.equal(200);
                                            should.exist(b);
                                            validateContacts([b]);
                                            request({
                                                uri: pot.resolve('accounts', '/apis/v/contacts/' + contact.id),
                                                method: 'GET',
                                                auth: {
                                                    bearer: client.users[2].token
                                                },
                                                json: true
                                            }, function (e, r, b) {
                                                if (e) {
                                                    return done(e);
                                                }
                                                r.statusCode.should.equal(200);
                                                should.exist(b);
                                                validateContacts([b]);
                                                done();
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});
