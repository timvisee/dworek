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
        },
        worker: {
            id: workerId,
            pid: process.pid,
            uptime: Math.floor(process.uptime())
        },
        server: {
            os: os.type(),
            platform: os.platform(),
            arch: os.arch(),
            loadavg: [
                loadAvg[0] >= 0 ? parseFloat(loadAvg[0]) : '?',
                loadAvg[1] >= 0 ? parseFloat(loadAvg[1]) : '?',
                loadAvg[2] >= 0 ? parseFloat(loadAvg[2]) : '?',
            ],
            cpus: os.cpus(),
            memory_system: {
                free: os.freemem(),
                used: os.totalmem() - os.freemem(),
                total: os.totalmem()
            },
            memory_app: {
                heapFree: memoryUsage.heapTotal - memoryUsage.heapUsed,
                heapUsed: memoryUsage.heapUsed,
                heapTotal: memoryUsage.heapTotal,
                rss: memoryUsage.rss,
                external: memoryUsage.external
            }
        },
        web: {
            online: true,
            uptime: Math.round(os.uptime())
        },
        live: {
            gameCount: Core.gameManager.getLoadedGameCount()
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
            queryCount: 0,
            objectCount: 0,
            fieldCount: 0
        }
    };

    // Fetch and process latency data
    const latencyList = Core.eventLoopMonitor.countLatency();
    status.server.latency = [
        Math.max.apply(null, latencyList),
        Math.min.apply(null, latencyList),
        percentile(latencyList, 50),
        percentile(latencyList, 90),
        percentile(latencyList, 99)
    ];

    // Make sure the minimum value is valid
    var minVal = status.server.latency[1];
    if(minVal === null || minVal === undefined || minVal < 0)
        status.server.latency[1] = 0;

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
            status.redis.memory = parseInt(redisInfo.used_memory);
            status.redis.memoryHuman = Formatter.formatBytes(status.redis.memory);
            status.redis.memoryLua = parseInt(redisInfo.used_memory_lua);
            status.redis.memoryLuaHuman = Formatter.formatBytes(status.redis.memoryLua);
            status.redis.memoryRss = parseInt(redisInfo.used_memory_rss);
            status.redis.memoryRssHuman = Formatter.formatBytes(status.redis.memoryRss);
            status.redis.memoryPeak = parseInt(redisInfo.used_memory_peak);
            status.redis.memoryPeakHuman = Formatter.formatBytes(status.redis.memoryPeak);

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

        // Append the number of queries on the objects, and the objects itself
        status.cache.queryCount += modelManager._instanceManager._queryCount;
        status.cache.objectCount += modelManager._instanceManager.count();

        // Iterate through the objects
        for(var object of modelManager._instanceManager._instances.values()) {
            status.cache.queryCount += object._baseModel._cache._queryCount;
            status.cache.fieldCount += object._baseModel._cache.getCacheCount();
        }
    }

    // Add humanly formatted properties
    status.server.latencyHuman = status.server.latency.map(function(val) {
        return Formatter.formatNano(val)
    });
    status.server.loadavgHuman = status.server.loadavg.map(function(val) {
        if(typeof val === 'number')
            return val.toFixed(3);
        else
            return val;
    });
    status.server.memory_system.freeHuman = Formatter.formatBytes(status.server.memory_system.free);
    status.server.memory_system.usedHuman = Formatter.formatBytes(status.server.memory_system.used);
    status.server.memory_system.totalHuman = Formatter.formatBytes(status.server.memory_system.total);
    status.server.memory_app.heapFreeHuman = Formatter.formatBytes(status.server.memory_app.heapFree);
    status.server.memory_app.heapUsedHuman = Formatter.formatBytes(status.server.memory_app.heapUsed);
    status.server.memory_app.heapTotalHuman = Formatter.formatBytes(status.server.memory_app.heapTotal);
    status.server.memory_app.rssHuman = Formatter.formatBytes(status.server.memory_app.rss);
    status.server.memory_app.externalHuman = Formatter.formatBytes(status.server.memory_app.external);

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
