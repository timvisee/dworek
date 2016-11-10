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

/**
 * Based on eventloop-latency, with various improvements/changes:
 * GitHub: https://github.com/korzhev/eventloop-latency
 */

'use strict';

const EE = require('events').EventEmitter;

const LATENCY_COUNT_RESET = 100;
const LATENCY_COUNT_THRESHOLD = 250;

class EventLoopMonitor extends EE {
    /**
     * @constructor
     * @param interval - interval between two events "data"
     * @param hrInterval - interval to compare with hrtime
     */
    constructor(interval, hrInterval) {
        super();
        this._time = process.hrtime();
        this.latency = [];
        this._ticks = [];
        this._hrInterval = hrInterval || 100;
        this._interval = interval || 5000;
        this._eventInterval = null;
        this._loopMonitorInterval = null;

        this._validateInteval();
    }

    /**
     *
     * @private
     */
    _validateInteval() {
        if (!Number.isInteger(this._interval) || !Number.isInteger(this._hrInterval) ||
            this._interval < 1000 ||
            this._hrInterval < 10 ||
            this._hrInterval >= 1000
        ) throw new Error('Interval should be integer, first one > 1000, second one in range 10-1000');
    }

    /**
     * finding diff between 2 hrtime
     */
    countLatency() {
        this.latency.length = 0;
        this._ticks.forEach((hrTick, i) => {
            if (i === 0) return;
            const latencyItem = Math.floor((
                hrTick[0] * 1e9 + hrTick[1] -
                (this._ticks[i - 1][0] * 1e9 + this._ticks[i - 1][1])
                - this._hrInterval * 1e6) / 1e3
            );
            if (latencyItem < 0) return;
            this.latency.push(latencyItem);
        });
        this._time = process.hrtime();
        return this.latency;
    }

    trimTicksArray() {
        // Return if we didn't reach the threshold yet
        if(this._ticks.length < LATENCY_COUNT_THRESHOLD)
            return;

        // Trim the array
        this._ticks = this._ticks.slice(-LATENCY_COUNT_RESET);
    }

    /**
     *
     * @private
     */
    _startToEmmit() {
        this._eventInterval = setInterval(() => {
            this.emit('data', this.countLatency());
        }, this._interval);
    }

    /**
     *
     * @param enableEmit
     */
    start(enableEmit) {
        // Store this instance
        const self = this;

        this._loopMonitorInterval = setInterval(() => {
            this._ticks.push(process.hrtime(this._time));
            self.trimTicksArray();
        }, this._hrInterval);
        if (enableEmit) this._startToEmmit();
    }

    /**
     *
     */
    stop() {
        clearInterval(this._loopMonitorInterval);
        clearInterval(this._eventInterval);
        this._ticks.length = 0;
        this.latency.length = 0;
    }
}

module.exports = EventLoopMonitor;
