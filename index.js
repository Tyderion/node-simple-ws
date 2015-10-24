'use strict';

var WebSocketServer = require('ws').Server;
/**
 *
 *
 */
module.exports = function(wsConf) {
    var wss = new WebSocketServer(wsConf);
    wss.on('connection', onConnection);
    var EVENTS = {
        message: '$message',
        error: '$error',
        unkown: '$unkown',
        close: '$close'
    };

    var handlers = {};
    var clients = [];

    return {
        on: on,
        emit: emit,
        availableEvents: EVENTS,
        close: function() {
            wss.close();
            fireEvent(EVENTS.close);
            clients = [];
            handlers = {};
        }
    };

    function on(event, handlerfn) {
        if (typeof event !== 'string' || typeof handlerfn !== 'function') {
            throw new Error('Need a string as first argument and a function as second.');
        }
        if (typeof handlers[event] !== 'undefined') {
            handlers[event].push(handlerfn);
        } else {
            handlers[event] = [handlerfn];
        }
    }

    function onError(error) {
        if (typeof error === 'undefined') {
            fireEvent(EVENTS.error, error);
        }
    }

    function emit(event, data) {
        if (typeof event !== 'string' || typeof data === 'function') {
            throw new Error('Need a string as first argument and no function as second.');
        }
        var message = {
            event: event,
            data: data
        };
        clients.forEach(client => client.send(JSON.stringify(message), onError));
    }

    function onConnection(ws) {
        clients.push(ws);
        ws.on('message', message => {
            fireEvent(EVENTS.message, message);
            var decoded;
            try {
                decoded = JSON.parse(message);
            } catch (err) {

            }
            if (typeof decoded !== 'object' || typeof decoded.event !== 'string' || typeof decoded.data === 'undefined') {
                fireEvent(EVENTS.unkown, message);
            } else {
                fireEvent(decoded.event, decoded.data);
            }
        });
    }

    function fireEvent(event, data) {
        var handlerfns = handlers[event];
        if (typeof handlerfns !== 'undefined') {
            handlerfns.forEach(handler => {
                handler.call(this, data);
            });
        }
    }
};
