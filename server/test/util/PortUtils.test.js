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

const mocha = require('mocha');
const it = mocha.it;
const describe = mocha.describe;
const assert = require('chai').assert;

const PortUtils = require('../../app/util/PortUtils');

// Port utilities module
describe('util.PortUtils', function() {
    // normalizePort function
    describe('normalizePort', function() {
        // Port number
        it('Port number', function () {
            assert.equal(PortUtils.normalizePort(123), 123);
            assert.equal(PortUtils.normalizePort(0), 0);
        });

        // Port number string
        it('Port number string', function () {
            assert.equal(PortUtils.normalizePort('123'), 123);
        });

        // Invalid port number
        it('Invalid port number', function () {
            assert.isFalse(PortUtils.normalizePort(-123));
            assert.isFalse(PortUtils.normalizePort('-123'));
        });

        // Port/pipeline name
        it('Pipeline number', function () {
            assert.equal(PortUtils.normalizePort('pipeline_name'), 'pipeline_name');
        });
    });
});
