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

// Inspired by:
// http://developmentnow.com/2015/02/05/make-your-node-js-api-bulletproof-how-to-test-with-mocha-chai-and-supertest/

/**
 * REST API host.
 *
 * @type {string} Host.
 */
const API_HOST = 'http://localhost:3000';

/**
 * REST API path.
 *
 * @type {string} Path.
 */
const API_URL = '/api/v1';



var mocha = require('mocha');
var it = mocha.it;
var chai = require('chai');
var supertest = require('supertest');
var api = supertest(API_HOST);



/**
 * Test the given endpoint.
 *
 * @param endpoint Endpoint path.
 *
 * @returns {Object} SuperTest endpoint request.
 */
function testEndpoint(endpoint) {
    // Make sure the endpoint starts with a slash, prefix it if that's not the case
    if(endpoint.charAt(0) !== '/')
        endpoint = '/' + endpoint;

    // Create the endpoint request
    var request = api.get(API_URL + endpoint);

    // Accept JSON
    request.set('Accept', 'application/json');

    // Return the request
    return request;
}

// Dummy test
it('Dummy test.', function(done) {
    done();
});

// // Make sure the API returns with a response code of 200
// it('Should give a 200 response.', function(done) {
//     testEndpoint('/test').expect(200, done);
// });
