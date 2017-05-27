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

var Raven = require('raven');

var appInfo = require('./appInfo');

// Define the cluster and count the number of CPU cores
const cluster = require('cluster');
const CPU_COUNT = require('os').cpus().length;

// Check whether the current instance is master of the cluster or not
if(cluster.isMaster) {
    // Starting cluster, show status message
    console.log('Starting ' + appInfo.APP_NAME + ' v' + appInfo.VERSION_NAME + ' (' + appInfo.VERSION_CODE + ') cluster...');

    // Show the master and a message that workers will be started
    console.log('Master ' + process.pid + ' online');

    // Load the configuration
    const config = require('./config');

    // Load the sentry properties
    const sentryEnable = config.sentry.enable;
    const sentryDsn = config.sentry.dsn;

    // Enable Sentry monitoring
    if(sentryEnable) {
        // Show an status message
        console.log('Enabling Sentry error monitoring...');

        // Configure and enable Raven for Sentry
        Raven.config(sentryDsn).install();

    } else
        console.log('Not enabling Sentry error monitoring, disabled in config.');

    // Print the number of available CPUs for workers
    console.log('Available CPUs for workers: ' + CPU_COUNT);

    // Determine the number of workers
    const workerCount = config.cluster.maxWorkerCount !== null && config.cluster.maxWorkerCount !== undefined ?
            workerCount = Math.min(config.cluster.maxWorkerCount, CPU_COUNT) :
            CPU_COUNT;

    // Show the number of workers to use
    console.log('Using number of workers: ' + workerCount);

    // Start the workers
    console.log('Staring ' + workerCount + ' worker' + (workerCount !== 1 ? 's' : '') + '...');

    // Fork the workers
    for(var i = 0; i < workerCount; i++)
        // Fork a worker
        cluster.fork();

    // Replace workers that die
    cluster.on('exit', function(worker, code, signal) {
        // Worker died, show a status message
        console.log('Worker ' + worker.process.pid + ' died. Starting new worker...');

        // Start a new worker
        cluster.fork();
    });

} else {
    // Show a status message
    console.log('Worker ' + process.pid + ' online');

    // Start the serve
    require('./server');
}