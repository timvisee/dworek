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

const Validator = require('../../app/validator/Validator');

// Validator module
describe('validator.Validator', function() {
    // isValidMail function
    describe('isValidMail', function() {
        // Valid mail
        it('Valid mail', function() {
            assert.isTrue(Validator.isValidMail('a@b.com'));
        });

        // No recipient
        it('No recipient', function() {
            assert.isFalse(Validator.isValidMail('@a.com'));
        });

        // Invalid recipient
        it('Invalid recipient', function() {
            assert.isFalse(Validator.isValidMail('a/\\?b@c.com'));
        });

        // No domain
        it('No domain', function() {
            assert.isFalse(Validator.isValidMail('a@'));
        });

        // Invalid domain
        it('Invalid domain', function() {
            assert.isFalse(Validator.isValidMail('a@b/\\?c.com'));
        });

        // No domain extension
        it('No domain extension', function() {
            assert.isFalse(Validator.isValidMail('a@b'));
            assert.isFalse(Validator.isValidMail('a@b.'));
        });

        // No @
        it('No @', function() {
            assert.isFalse(Validator.isValidMail('ab.com'));
        });

        // Multiple @
        it('Multiple @', function() {
            assert.isFalse(Validator.isValidMail('a@b@c.com'));
        });
    });
});
