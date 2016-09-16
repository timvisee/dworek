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
     * - game: Game ID this update is for
     * - location.latitude: latitude value
     * - location.longitude: longitude value
     * - location.altitude: altitude value
     * - location.accuracy: accuracy in meters
     * - location.altitudeAccuracy: altitude accuracy in meters
     */
    LOCATION_UPDATE: 10,

    /**
     * Packet containing the game/user info of a game.
     * Send from the server to the client.
     *
     * Data:
     * - game: Game ID this info is for
     * - stage: Game stage number
     * - roles.player: True if the user is a player, false if not.
     * - roles.spectator: True if the user is a spectator, false if not.
     * - roles.special: True if the user is special, false if not.
     * - roles.requested: True if the user requested to join this game, false if not.
     */
    GAME_INFO: 11,

    /**
     * Request from a client to the server, to send the client the latest game information.
     *
     * Data:
     * - game: Game ID this info is requested for
     */
    GAME_INFO_REQUEST: 12,

    /**
     * Location updates for users and other things in a game, relevant to the attached to the socket.
     * This packet is send from the server to a client.
     *
     * Data:
     * - game: ID of the game we're sending locations for
     * - users[]: Array of user objects
     * - users[].user: ID of the user
     * - users[].userName: Display name of the user
     * - users[].location: Location object of the user.
     * - users[].location.latitude: Latitude
     * - users[].location.longitude: Longitude
     */
    GAME_LOCATIONS_UPDATE: 13,

    /**
     * Request a game data packet.
     * This packet is send form a client to the server.
     *
     * Data:
     * - game: ID of the game to request the game data for.
     */
    GAME_DATA_REQUEST: 14,

    /**
     * Game data packet.
     *
     * Data:
     * - game: ID of the game the data is for.
     * - data: The actual game data.
     * - data.factory.canBuild: True if the user can build a factory, false if not.
     * - data.factory.cost: New factory cost
     */
    GAME_DATA: 15,

    /**
     * Request from a client to the server to build a factory.
     *
     * Data:
     * - game: ID of the game.
     * - name: Factory name.
     */
    FACTORY_BUILD_REQUEST: 16,

    /**
     * Response from the server to a client that a factory is build.
     *
     * Data:
     * - game: ID of the game.
     * - factory: ID of the factory that is build.
     */
    FACTORY_BUILD_RESPONSE: 17,

    /**
     * Request from a client for the latest factory data.
     *
     * Data:
     * - factory: ID of the factory.
     */
    FACTORY_DATA_REQUEST: 18,

    /**
     * Response from the server to a client with the latest factory data.
     *
     * Data:
     * - game: ID of the game.
     * - factory: ID of the factory.
     * - data: Factory data.
     * - data.name: Factory name.
     * - data.level: Factory level.
     * - data.creatorName: Creator name.
     * - data.teamName: Team name.
     * - data.defence: Defence value.
     * - data.in: In value.
     * - data.out: Out value.
     */
    FACTORY_DATA: 19,

    /**
     * Send from a client to the server to update a factory.
     *
     * Data:
     * - factory: ID of the factory
     * - index: Index of the upgrade to buy
     * - cost: Cost of the upgrade (check)
     * - defence: Defence level of the upgrade (check)
     */
    FACTORY_DEFENCE_BUY: 20
};
