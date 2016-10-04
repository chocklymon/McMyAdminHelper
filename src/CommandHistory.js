/*
 * McMyAdminHelper
 * http://chockly.org/
 *
 * Copyright © 2015-2016 Curtis Oakley
 * Licensed under the MIT license.
 */

var CommandHistory = (function () {
    "use strict";

    var
        /** Stores what command in the sent commands is currently being looked at. */
        current = 0,

        /** Used to store any text currently in the input box. */
        tempCommand = "",

        /** The maximum number of commands to store. */
        maxCommands = 20,

        /** Store commands and messages that have been sent to the server. */
        sentCommands = [];

    function hasPrev() {
        return current > 0;
    }

    function hasNext() {
        return current < sentCommands.length;
    }

    function add(command) {
        // Don't store a command that is the same as the last one.
        if (sentCommands[sentCommands.length - 1] === command) {
            return;
        }

        // Store the command
        sentCommands.push(command);

        // Remove old commands as needed
        while (sentCommands.length > maxCommands) {
            sentCommands.shift();
        }

        // Reset the current command pointer
        current = sentCommands.length;
    }

    function previous(currentValue) {
        if (current === sentCommands.length) {
            // Store the current command into history
            tempCommand = currentValue;
        }

        if (hasPrev()) {
            current--;
        }

        return sentCommands[current];
    }

    function next() {
        if (hasNext()) {
            current++;
        }

        if (current === sentCommands.length) {
            return tempCommand;
        }

        return sentCommands[current];
    }

    return {
        /**
         * Add a command to the list of used commands.
         * @param {string} command The command to add.
         */
        add: add,

        /**
         * Indicates if the history has a previous command.
         * @returns {Boolean} True if there is a previous command.
         */
        hasPrev: hasPrev,

        /**
         * Incdicates if the history has a next command.
         * @returns {Boolean} True if the history has a next command
         */
        hasNext: hasNext,

        /**
         * The previous entered command.
         * @returns {string} The previous command.
         */
        prev: previous,

        /**
         * The next command that was entered.
         * @returns {string} The next command.
         */
        next: next
    };
})();
