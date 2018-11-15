/*
 * McMyAdminHelper
 * http://chockly.org/
 *
 * Copyright © 2015 Curtis Oakley
 * Licensed under the MIT license.
 */
"use strict";

/* globals describe it expect CommandHistory */
describe("Command History Tests", function () {
    var testCommand = "/test command",
        testCommand2 = "/end";

    it("Keeps track of history", function () {
        var i;

        // Starts empty
        expect(CommandHistory.hasNext()).toBe(false);
        expect(CommandHistory.hasPrev()).toBe(false);

        // Can add command //
        CommandHistory.add(testCommand);
        expect(CommandHistory.hasNext()).toBe(false);
        expect(CommandHistory.hasPrev()).toBe(true);

        // Can get last command //
        var lastCommand = CommandHistory.prev();
        expect(lastCommand).toBe(testCommand);
        expect(CommandHistory.hasNext()).toBe(true);
        expect(CommandHistory.hasPrev()).toBe(false);

        // Can un-get last command //
        var command = CommandHistory.next();
        expect(command).not.toBeDefined();
        expect(CommandHistory.hasNext()).toBe(false);
        expect(CommandHistory.hasPrev()).toBe(true);

        // Remembers current command //
        var currentCommand = "/s Hi";
        CommandHistory.prev(currentCommand);
        var returnedCommand = CommandHistory.next();

        expect(returnedCommand).toBe(currentCommand);

        // Prevents duplicate last command //
        CommandHistory.add(testCommand);

        lastCommand = CommandHistory.prev();
        expect(lastCommand).toBe(testCommand);
        expect(CommandHistory.hasNext()).toBe(true);

        // If it was added there would be a second command and this would be true
        expect(CommandHistory.hasPrev()).toBe(false);

        // Adds command to end //
        CommandHistory.add(testCommand2);

        var expectedHistory = [testCommand2, testCommand];
        for (i = 0; CommandHistory.hasNext() && i < 3; i++) {
            expect(i).toBeLessThan(2);
            expect(CommandHistory.next()).toBe(expectedHistory[i]);
        }
        expect(CommandHistory.hasNext()).toBe(false);

        // Goes forward correctly //
        expectedHistory = [testCommand2, testCommand];
        for (i = 0; CommandHistory.hasPrev() && i < 3; i++) {
            expect(i).toBeLessThan(2);
            expect(CommandHistory.prev()).toBe(expectedHistory[i]);
        }
        expect(CommandHistory.hasPrev()).toBe(false);

        // Changes directions correctly //
        var command1 = "Hi",
            command2 = "/ban player1";

        CommandHistory.add(command1);
        CommandHistory.add(command2);

        returnedCommand = CommandHistory.prev("");
        expect(returnedCommand).toBe(command2);
        expect(CommandHistory.hasNext()).toBe(true);
        expect(CommandHistory.hasPrev()).toBe(true);

        returnedCommand = CommandHistory.prev();
        expect(returnedCommand).toBe(command1);
        expect(CommandHistory.hasNext()).toBe(true);
        expect(CommandHistory.hasPrev()).toBe(true);

        returnedCommand = CommandHistory.next();
        expect(returnedCommand).toBe(command2);
        expect(CommandHistory.hasNext()).toBe(true);
        expect(CommandHistory.hasPrev()).toBe(true);

        returnedCommand = CommandHistory.next();
        expect(returnedCommand).toBe("");
        expect(CommandHistory.hasNext()).toBe(false);
        expect(CommandHistory.hasPrev()).toBe(true);

        // Limits the number of stored commands //
        var maxCommands = 20;

        // Add max commands plus two to the history
        for (var commandCount = 0; commandCount < (maxCommands + 2); commandCount++) {
            CommandHistory.add("Max Command Test #" + commandCount);
        }

        // Count how many commands there are (with a sanity check to prevent infinity loops)
        var totalCommands = 0;
        for (i = 0; CommandHistory.hasPrev() && i < (maxCommands + 4); i++) {
            CommandHistory.prev();
            totalCommands++;
        }

        expect(totalCommands).toEqual(maxCommands);
        expect(CommandHistory.hasNext()).toBe(true);
        expect(CommandHistory.hasPrev()).toBe(false);
    });
});
