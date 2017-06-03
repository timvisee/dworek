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
 * Core class.
 *
 * @class
 * @constructor
 */
var Core = function() {};

/**
 * Model manager root.
 *
 * @type {Object}
 */
Core.model = {};

/**
 * User model manager.
 *
 * @type {UserModelManager|null} User model manager, or null if it isn't instantiated yet.
 */
Core.model.userModelManager = null;

/**
 * Session model manager.
 *
 * @type {SessionModelManager|null} Session model manager, or null if it isn't instantiated yet.
 */
Core.model.sessionModelManager = null;

/**
 * Game model manager.
 *
 * @type {GameModelManager|null} Game model manager, or null if it isn't instantiated yet.
 */
Core.model.gameModelManager = null;

/**
 * Game team model manager.
 *
 * @type {GameTeamModelManager|null} Game team model manager, or null if it isn't instantiated yet.
 */
Core.model.gameTeamModelManager = null;

/**
 * Game user model manager.
 *
 * @type {GameUserModelManager|null} Game user model manager, or null if it isn't instantiated yet.
 */
Core.model.gameUserModelManager = null;

/**
 * Get the factory model manager.
 *
 * @type {FactoryModelManager|null} Factory model manager, or null if it isn't instantiated yet.
 */
Core.model.factoryModelManager = null;

/**
 * HTTP(S) server instance.
 *
 * @type {*} Server instance.
 */
Core.server = null;

/**
 * Express app instance.
 *
 * @type {*} Express app.
 */
Core.expressApp = null;

/**
 * Router instance.
 *
 * @type {Router}
 */
Core.router = null;

/**
 * Game manager instance.
 *
 * @type {GameManager|null} Game manager instance, or null if the core hasn't been initialized.
 */
Core.gameManager = null;

/**
 * Real time server instance.
 *
 * @type {RealTime}
 */
Core.realTime = null;

/**
 * Event loop monitor.
 *
 * @type {EventLoopMonitor}
 */
Core.eventLoopMonitor = null;

// Export the class
module.exports = Core;
