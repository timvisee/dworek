/******************************************************************************
 * Copyright (c) Dworek 2017. All rights reserved.                            *
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

var _= require('lodash');

var cluster = require('cluster');
var express = require('express');
var os = require('os');
var process = require('process');
var percentile = require('stats-percentile');

var config = require('../../config');
var appInfo = require('../../appInfo');
var Core = require('../../Core');
var LayoutRenderer = require('../layout/LayoutRenderer');
var RedisUtils = require('../redis/RedisUtils');
var CallbackLatch = require('../util/CallbackLatch');
var Formatter = require('../format/Formatter');

/**
 * StatusUtils class.
 *
 * @class
 * @constructor
 */
var StatusUtils = function() {};

/**
 * Get an object containing all relevant status.
 *
 * @param {StatusUtils~getStatusCallback} callback Callback containing the status object.
 */
StatusUtils.getStatus = function(callback) {
    // Do not fetch the status when the callback isn't a function
    if(!_.isFunction(callback))
        return;

    // Create a callback latch
    var latch = new CallbackLatch();

    // Get the CPU load average
    const loadAvg = os.loadavg();

    // Get the memory usage data
    var memoryUsage = process.memoryUsage();

    // Determine whether this is the master thread, and get the PID
    var isMaster = cluster.isMaster;
    var workerId = !isMaster ? cluster.worker.id : '?';

    // Layout options object
    var status = {
        cluster: {
            serverCount: 1,
            isMaster: isMaster,
            workerCount: os.cpus().length,
            workerId: workerId,
            pid: process.pid
        },
        server: {
            os: os.type(),
            platform: os.platform(),
            arch: os.arch(),
            loadavg: [
                loadAvg[0] !== 0 ? loadAvg[0].toFixed(3) : '?',
                loadAvg[1] !== 0 ? loadAvg[1].toFixed(3) : '?',
                loadAvg[2] !== 0 ? loadAvg[2].toFixed(3) : '?',
            ],
            cpus: os.cpus(),
            memory_system: {
                free: Formatter.formatBytes(os.freemem()),
                used: Formatter.formatBytes(os.totalmem() - os.freemem()),
                total: Formatter.formatBytes(os.totalmem())
            },
            memory_app: {
                heapFree: Formatter.formatBytes(memoryUsage.heapTotal - memoryUsage.heapUsed),
                heapUsed: Formatter.formatBytes(memoryUsage.heapUsed),
                heapTotal: Formatter.formatBytes(memoryUsage.heapTotal),
                rss: Formatter.formatBytes(memoryUsage.rss),
                external: Formatter.formatBytes(memoryUsage.external)
            }
        },
        web: {
            online: true,
            uptime: Math.round(os.uptime())
        },
        live: {
            gameCount: Core.gameController.getLoadedGameCount()
        },
        realtime: {
            online: Core.realTime.isOnline(),
            connections: Core.realTime.getConnectionCount()
        },
        mongo: {
            online: true
        },
        redis: {
            online: RedisUtils.isReady()
        },
        cache: {
            objectCount: 0,
            fieldCount: 0
        }
    };

    // Fetch and process latency data
    const latencyList = Core.eventLoopMonitor.countLatency();
    status.server.latency = [
        Formatter.formatNano(Math.max.apply(null, latencyList)),
        Formatter.formatNano(Math.min.apply(null, latencyList)),
        Formatter.formatNano(percentile(latencyList, 50)),
        Formatter.formatNano(percentile(latencyList, 90)),
        Formatter.formatNano(percentile(latencyList, 99))
    ];

    // Get the redis status if ready
    if(RedisUtils.isReady()) {
        // Get the Redis connection
        var redis = RedisUtils.getConnection();

        // Call the Redis info command
        latch.add();
        redis.info(function(err) {
            // Call back errors
            if(err !== null) {
                next(err);
                return;
            }

            // Get the info section of the current Redis database
            var redisInfo = redis.server_info;
            var redisDbInfo = redisInfo['db' + config.redis.dbNumber];

            // Get the data
            status.redis.uptime = parseInt(redisInfo.uptime_in_seconds);
            status.redis.commandCount = parseInt(redisInfo.total_commands_processed);
            status.redis.keyCount = redisDbInfo != undefined ? redisDbInfo.keys : 0;
            status.redis.memory = redisInfo.used_memory_peak_human;

            // Resolve the latch
            latch.resolve();
        });
    }

    // Go through the internal cache
    for(var modelManagerName in Core.model) {
        // make sure the manager is in Core.model
        if(!Core.model.hasOwnProperty(modelManagerName))
            continue;

        // Get the model manager
        var modelManager = Core.model[modelManagerName];

        // Append the number of objects to the count
        status.cache.objectCount += modelManager._instanceManager.count();

        // Iterate through the objects
        for(var object of modelManager._instanceManager._instances.values())
            status.cache.fieldCount += object._baseModel._cache.getCacheCount();
    }

    // Call back when all status is fetched
    latch.then(function () {
        callback(null, status);
    });
};

/**
 * @callback StatusUtils~getStatusCallback
 * @param {Error|null} Error instance if an error occurred, null otherwise.
 * @param {object} Object containing all status properties.
 */

// Export the class
module.exports = StatusUtils;