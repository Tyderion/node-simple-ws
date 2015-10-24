'use strict';
var chai = require('chai');
var spies = require('chai-spies');
chai.use(spies);
var expect = chai.expect;
var angularWebsockets = require('./');
var WebSocket = require('ws');
var port = 8888;

var server = angularWebsockets({
    port: port
});

beforeEach(function() {
    server.close();
    server = angularWebsockets({
        port: port
    });
});

it('should connect', function(done) {
    var ws = new WebSocket('ws://localhost:' + port);
    ws.on('open', function open() {
        done();
    });
});

describe('EVENTS', function() {
    it('should have exist and be an object', function() {
        expect(typeof server.EVENTS).to.equal('object');
    });
    it('should have property \'close\' of type string', function() {
        expect(typeof server.EVENTS.close).to.equal('string');
    });
    it('should have property \'error\' of type string', function() {
        expect(typeof server.EVENTS.error).to.equal('string');
    });
    it('should have property \'unkown\' of type string', function() {
        expect(typeof server.EVENTS.unkown).to.equal('string');
    });
    it('should have property \'message\' of type string', function() {
        expect(typeof server.EVENTS.message).to.equal('string');
    });
});

describe('close', function() {
    it('should have exist and be a function', function() {
        expect(typeof server.close).to.equal('function');
    });
    it('should close the server connections', function(done) {
        var ws = new WebSocket('ws://localhost:' + port);
        ws.on('close', function() {
            done();
        });
        ws.on('open', function open() {
            server.close();
        });
    });
    it('should call on-\'server.EVENTS.close\'-listeners once when closing the server', function() {
        var spy = chai.spy();
        server.on(server.EVENTS.close, spy);
        server.close();
        expect(spy).to.be.called.once();
    });
    it('should call all on-server.EVENTS.close-listeners once when closing the server', function() {
        var spy = chai.spy();
        server.on(server.EVENTS.close, spy);
        server.on(server.EVENTS.close, spy);
        server.close();
        expect(spy).to.be.called.twice();
    });
});

describe('on', function() {
    it('should have exist and be a function', function() {
        expect(typeof server.on).to.equal('function');
    });
    it('should accept only a string and a function as argument', function() {
        expect(server.on.bind(server, 5, 'doStuff')).to.throw('Need a string as first argument and a function as second.');
        expect(server.on.bind(server, '5', 'doStuff')).to.throw('Need a string as first argument and a function as second.');
        expect(server.on.bind(server, '5', {
            test: 1
        })).to.throw('Need a string as first argument and a function as second.');
        expect(server.on.bind(server, '5', function() {})).not.to.throw();
    });
    it('should call the event-listener when event is emitted from a client', function(done) {
        var ws = new WebSocket('ws://localhost:' + port);
        server.on('myEvent', function() {
            done();
        });
        ws.on('open', function open() {
            ws.send(JSON.stringify({
                event: 'myEvent',
                data: 'string'
            }));
        });
    });
    it('should call only the correct event-listeners when event is emitted from a client', function(done) {
        var client = new WebSocket('ws://localhost:' + port);
        server.on('someotherEvent', function() {
            done(new Error());
        });
        server.on('myEvent', function() {
            done();
        });

        client.on('open', function open() {
            client.send(JSON.stringify({
                event: 'myEvent',
                data: 'string'
            }));
        });
    });
    it('should send event server.EVENTS.unkown when the data is not a string in the form { event: \'name\', data: \'data\'}', function(done) {
        var client = new WebSocket('ws://localhost:' + port);
        server.on(server.EVENTS.error, function() {
            done(new Error('$error should not be called'));
        });
        server.on(server.EVENTS.unkown, function(data) {
            expect(data).to.equal('test');
            done();
        });
        client.on('open', function open() {
            client.send('test');
        });
    });
    it('should call all event-listeners when event is emitted from a client', function(done) {
        var client = new WebSocket('ws://localhost:' + port);
        var spy = chai.spy();
        server.on('myEvent', spy);
        server.on('myEvent', spy);

        client.on('open', function open() {
            client.send(JSON.stringify({
                event: 'myEvent',
                data: 'string'
            }));
            client.close();
        });
        client.on('close', function() {
            expect(spy).to.be.called.twice();
            done();
        });
    });
});

describe('emit', function() {
    it('should exist', function() {
        expect(typeof server.emit).to.equal('function');
    });
    it('should accept only a string and enything except a function', function() {
        expect(server.emit.bind(server, 5, 'doStuff')).to.throw('Need a string as first argument and no function as second.');
        expect(server.emit.bind(server, '5', function() {})).to.throw('Need a string as first argument and no function as second.');
        expect(server.emit.bind(server, '5', {
            test: 1
        })).not.to.throw();
    });
    it('should send events to a client in the form { event: \'name\', data: \'data\'}', function(done) {
        var client = new WebSocket('ws://localhost:' + port);
        client.on('open', function open() {
            client.on('message', function(data) {
                expect(JSON.parse.bind(JSON, data)).not.to.throw();
                var decoded = JSON.parse(data);
                expect(decoded.event).to.equal('myEvent');
                expect(decoded.data).to.equal('data');
                done();
                server.close();
            });
            server.emit('myEvent', 'data');
        });
    });
    it('should send events to all clients in the form { event: \'name\', data: \'data\'}', function(done) {
        var client = new WebSocket('ws://localhost:' + port);
        var client2 = new WebSocket('ws://localhost:' + port);

        function onEvent(data) {
            expect(JSON.parse.bind(JSON, data)).not.to.throw();
            var decoded = JSON.parse(data);
            expect(decoded.event).to.equal('myEvent');
            expect(decoded.data).to.equal('data');
            server.close();
        }

        var spy = chai.spy(onEvent);
        client.on('open', function() {
            client.on('message', spy);
        });
        client2.on('open', function() {
            client2.on('message', spy);
            server.emit('myEvent', 'data');
        });
        client.on('close', function() {
            expect(spy).to.be.called.twice();
            done();
        });
    });
});
