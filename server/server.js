/******************************************************************************
 * Copyright (c) Dworek 2016. All rights reserved.                            *
 *                                                                            *
 * @author Tim Visee                                                          *
 * @website http://timvisee.com/                                              *
 *                                                                            *
 * Open Source != No Copyright                                                *
 *                                                                            *
 * Permission is hereby granted, free of charge, to any person obtaining a    *
 * copy of this software and associated documentation files (the "Software"), *
 * to deal in the Software without restriction, including without limitation  *
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,   *
 * and/or sell copies of the Software, and to permit persons to whom the      *
 * Software is furnished to do so, subject to the following conditions:       *
 *                                                                            *
 * The above copyright notice and this permission notice shall be included    *
 * in all copies or substantial portions of the Software.                     *
 *                                                                            *
 * You should have received a copy of The MIT License (MIT) along with this   *
 * program. If not, see <http://opensource.org/licenses/MIT/>.                *
 ******************************************************************************/

var config = require('./config');
var appInfo = require('./appInfo');
var debug = require('debug')(config.debug.name);
var http = require('http');
var App = require('./App');
var Core = require('./Core');
var PortUtils = require('./app/util/PortUtils');

/**
 * Server instance.
 */
var server;

/**
 * Web listening port.
 */
var webPort;

// Create an app instance
var app = new App(false);

// Initialize
init();

/**
 * Initialize.
 */
function init() {
    // Starting the application
    console.log('Starting ' + appInfo.APP_NAME + ' v' + appInfo.VERSION_NAME + ' (' + appInfo.VERSION_CODE + ')' + '...');

    // Initialize the application
    app.init(function(err) {
        // Handle errors
        if(err !== null)
            throw err;

        // Start the web server
        startWebServer();
    });
}

/**
 * Start the web server.
 */
function startWebServer() {
    // Set the web listening port
    webPort = PortUtils.normalizePort(config.web.port);
    Core.expressApp.set('port', webPort);

    // Create the HTTP server
    server = http.createServer(Core.expressApp);

    // Listen on provided port, on all network interfaces.
    server.listen(webPort);
    server.on('error', onError);
    server.on('listening', onListening);
}

/**
 * Event listener for HTTP server error event.
 *
 * @throws
 */
function onError(error) {
    // Make sure this originates from the listen call
    if(error.syscall !== 'listen')
        throw error;

    // Build a port/pipe string
    var bind = typeof webPort === 'string'
        ? 'Pipe ' + webPort
        : 'Port ' + webPort;

    // Handle specific listen errors with friendly messages
    switch(error.code) {
        case 'EACCES':
            // No access to listen to the given port
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;

        case 'EADDRINUSE':
            // The port is already in use
            console.error(bind + ' is already in use');
            process.exit(1);
            break;

        default:
            // Throw the error
            throw error;
    }
}

/**
 * Event listener for HTTP server listening event.
 */
function onListening() {
    // Get the address
    var address = server.address();

    // Build a port/pipe string
    var bind = typeof address === 'string'
        ? 'pipe ' + address
        : 'port ' + address.port;

    // Debug a listening message
    debug('Web server listening on ' + bind);
}