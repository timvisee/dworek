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

// Export the module, with the packet types
module.exports = {
    /**
     * Authentication request from the client to the server.
     *
     * Data:
     * - session: session token or an empty string
     */
    AUTH_REQUEST: 1,

    /**
     * Authentication response from the server to the client.
     *
     * Data:
     * - loggedIn: true if the user is logged in, false if not
     * - [valid]: true if the session was valid, false if not
     * - user: session user ID
     */
    AUTH_RESPONSE: 2,

    /**
     * Change the stage of the given game.
     *
     * Data:
     * - game: ID of the game to change.
     * - stage: new stage value
     */
    GAME_STAGE_CHANGE: 3,

    /**
     * Packet to a client if the state of a game changed.
     *
     * Data:
     * - game: ID of the game that is changed
     * - gameName: name of the game
     * - stage: new stage value
     * - joined: true if the user joined this game, false if not.
     */
    GAME_STAGE_CHANGED: 5,

    /**
     * Show a message from the server on the client.
     *
     * Data:
     * - message: message to show
     * - error: true if this is an error message, false if not
     * - [dialog]: true to show a dialog, false to not
     * - [toast]: true to show a toast notification, false to not
     */
    MESSAGE_RESPONSE: 4,

    /**
     * Broadcast a message to all users that joined this game. This is a request from a client to the server.
     *
     * Data:
     * - message: message to broadcast
     * - game: ID of the game to broadcast the message for
     */
    BROADCAST_MESSAGE_REQUEST: 6,

    /**
     * Broadcast a message from the server to the client.
     *
     * Data:
     * - uid: unique broadcast ID
     * - message: message to broadcast
     * - game: ID of the game to broadcast a message for
     * - gameName: name of the game a message is broadcasted for
     */
    BROADCAST_MESSAGE: 7,

    /**
     * Resolve all broadcasts.
     * This packet is send from a client to the server.
     */
    BROADCAST_RESOLVE_ALL: 8,

    /**
     * Resolve the broadcast with the given token.
     * This packet is send from a client to the server.
     *
     * Data:
     * - token: Token of the broadcast to resolve.
     */
    BROADCAST_RESOLVE: 9,

    /**
     * Location update from the client to the server.
     *
     * Data:
     * - game: Game this update is for
     * - location.latitude: latitude value
     * - location.longitude: longitude value
     */
    LOCATION_UPDATE: 10
};
