'use strict';
var assert = require('assert');
var chai = require('chai');
var spies = require('chai-spies');
chai.use(spies);
// var should = chai.should();
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

describe('close', function() {
    it('should have a function \'close\'', function() {
        assert(typeof server.close === 'function');
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
    it('should call on-\'close\'-listeners once when closing the server', function() {
        var spy = chai.spy();
        server.on('$close', spy);
        server.close();
        expect(spy).to.be.called.once();
    });
    it('should call all on-\'close\'-listeners once when closing the server', function() {
        var spy = chai.spy();
        server.on('$close', spy);
        server.on('$close', spy);
        server.close();
        expect(spy).to.be.called.twice();
    });
});

describe('on', function() {
    it('should have a function "on"', function() {
        assert(typeof server.on === 'function');
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
    it('should send event $unkown when the data is not a string in the form { event: \'name\', data: \'data\'}', function(done) {
        var client = new WebSocket('ws://localhost:' + port);
        server.on('$error', function() {
            done(new Error('$error should not be called'));
        });
        server.on('$unkown', function(data) {
            expect(data).to.equal('test');
            done();
        });
        client.on('open', function open() {
            client.send('test');
        });
    });
    it('should call all event-listeners when event is emitted from a client', function(done) {
        var ws = new WebSocket('ws://localhost:' + port);
        var spy = chai.spy();
        server.on('myEvent', spy);
        server.on('myEvent', spy);

        ws.on('open', function open() {
            ws.send(JSON.stringify({
                event: 'myEvent',
                data: 'string'
            }));
            ws.close();
        });
        ws.on('close', function() {
            expect(spy).to.be.called.twice();
            done();
        });
    });
});
