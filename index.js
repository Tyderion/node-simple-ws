'use strict';

var WebSocketServer = require('ws').Server;
/**
 * Simple IMplementiation
 * @module node-simple-ws
 * @exports SimpleServer
 * @see {@link SimpleServer}
 */
module.exports = SimpleServer;

/**
 * Simple Websockets with event names
 * @class SimpleServer
 * @param wsConf the Configuration for the underlying ws server
 */
function SimpleServer(wsConf) {
    if (!(this instanceof SimpleServer)) {
        return new SimpleServer(wsConf);
    }
    var wss = new WebSocketServer(wsConf);
    var handlers = {};
    var clients = [];

    wss.on('connection', onConnection.bind(this));
    /**
     * Contains all special events that are emitted
     * @type {Object}
     * @property {string} message Message event emitted for every message received
     * @property {string} error error event emitted when encountering an error
     * @property {string} unkown unkown event emitted when a client sends an event without a name
     * @property {string} close close event emitted when the server closes
     */
    this.EVENTS = {
        message: '$message',
        error: '$error',
        unkown: '$unkown',
        close: '$close'
    };

    /**
     * Sets an event listener for event
     * @type {Function}
     * @param {string} event the event name
     * @param {function} handler the event handler
     */
    this.on = function on(event, handlerfn) {
        if (typeof event !== 'string' || typeof handlerfn !== 'function') {
            throw new Error('Need a string as first argument and a function as second.');
        }
        if (typeof handlers[event] !== 'undefined') {
            handlers[event].push(handlerfn);
        } else {
            handlers[event] = [handlerfn];
        }
    };

    /**
     * Emits an event
     * @param {string} event the event name
     * @param {(object|string|number|boolean)} the data to send
     */
    this.emit = function emit(event, data) {
        if (typeof event !== 'string' || typeof data === 'function') {
            throw new Error('Need a string as first argument and no function as second.');
        }
        var message = {
            event: event,
            data: data
        };
        clients.forEach(client => client.send(JSON.stringify(message), onError.bind(this)));
    };
    /**
     * Close the server
     * @description
     * Closes the server and emits a close event
     */
    this.close = function close() {
        wss.close();
        fireEvent(this.EVENTS.close);
        clients = [];
        handlers = {};
    };

    function onError(error) {
        if (typeof error === 'undefined') {
            fireEvent(this.EVENTS.error, error);
        }
    }

    function onConnection(ws) {
        clients.push(ws);
        ws.on('message', message => {
            fireEvent(this.EVENTS.message, message);
            var decoded;
            try {
                decoded = JSON.parse(message);
            } catch (err) {

            }
            if (typeof decoded !== 'object' || typeof decoded.event !== 'string' || typeof decoded.data === 'undefined') {
                fireEvent(this.EVENTS.unkown, message);
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
}
