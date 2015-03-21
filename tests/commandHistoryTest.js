/*
 * McMyAdminHelper
 * http://chockly.org/
 *
 * Copyright © 2015 Curtis Oakley
 * Licensed under the MIT license.
 */
"use strict";

/* globals describe it expect commandHistory */
describe("Command History Tests", function () {
    var testCommand = "/test command",
        testCommand2 = "/end";

    it("Starts Empty", function () {
        expect(commandHistory.hasNext()).toBe(false);
        expect(commandHistory.hasPrev()).toBe(false);
    });

    it("Can add command", function () {
        commandHistory.add(testCommand);
        expect(commandHistory.hasNext()).toBe(false);
        expect(commandHistory.hasPrev()).toBe(true);
    });

    it("Can get last command", function () {
        var lastCommand = commandHistory.prev();
        expect(lastCommand).toBe(testCommand);
        expect(commandHistory.hasNext()).toBe(true);
        expect(commandHistory.hasPrev()).toBe(false);
    });

    it("Can un-get last command", function () {
        var command = commandHistory.next();
        expect(command).not.toBeDefined();
        expect(commandHistory.hasNext()).toBe(false);
        expect(commandHistory.hasPrev()).toBe(true);
    });

    it("Remembers current command", function () {
        var currentCommand = "/s Hi";
        commandHistory.prev(currentCommand);
        var returnedCommand = commandHistory.next();

        expect(returnedCommand).toBe(currentCommand);
    });

    it("Prevents duplicate last command", function () {
        commandHistory.add(testCommand);

        var lastCommand = commandHistory.prev();
        expect(lastCommand).toBe(testCommand);
        expect(commandHistory.hasNext()).toBe(true);

        // If it was added there would be a second command and this would be true
        expect(commandHistory.hasPrev()).toBe(false);
    });

    it("Adds command to end", function () {
        commandHistory.add(testCommand2);

        var expectedHistory = [testCommand2, testCommand];
        for (var i = 0; commandHistory.hasNext() && i < 3; i++) {
            expect(i).toBeLessThan(2);
            expect(commandHistory.next()).toBe(expectedHistory[i]);
        }
        expect(commandHistory.hasNext()).toBe(false);
    });

    it("Goes forward correctly", function () {
        var expectedHistory = [testCommand2, testCommand];
        for (var i = 0; commandHistory.hasPrev() && i < 3; i++) {
            expect(i).toBeLessThan(2);
            expect(commandHistory.prev()).toBe(expectedHistory[i]);
        }
        expect(commandHistory.hasPrev()).toBe(false);
    });

    it("Changes directions correctly", function () {
        var command1 = "Hi",
            command2 = "/ban player1";

        commandHistory.add(command1);
        commandHistory.add(command2);

        var returnedCommand = commandHistory.prev("");
        expect(returnedCommand).toBe(command2);
        expect(commandHistory.hasNext()).toBe(true);
        expect(commandHistory.hasPrev()).toBe(true);

        returnedCommand = commandHistory.prev();
        expect(returnedCommand).toBe(command1);
        expect(commandHistory.hasNext()).toBe(true);
        expect(commandHistory.hasPrev()).toBe(true);

        returnedCommand = commandHistory.next();
        expect(returnedCommand).toBe(command2);
        expect(commandHistory.hasNext()).toBe(true);
        expect(commandHistory.hasPrev()).toBe(true);

        returnedCommand = commandHistory.next();
        expect(returnedCommand).toBe("");
        expect(commandHistory.hasNext()).toBe(false);
        expect(commandHistory.hasPrev()).toBe(true);
    });

    it("Limits the number of stored commands", function () {
        var maxCommands = 20;

        // Add max commands plus two to the history
        for (var commandCount = 0; commandCount < (maxCommands + 2); commandCount++) {
            commandHistory.add("Max Command Test #" + commandCount);
        }

        // Count how many commands there are (with a sanity check to prevent infinity loops)
        var totalCommands = 0;
        for (var i = 0; commandHistory.hasPrev() && i < (maxCommands + 4); i++) {
            commandHistory.prev();
            totalCommands++;
        }

        expect(totalCommands).toEqual(maxCommands);
        expect(commandHistory.hasNext()).toBe(true);
        expect(commandHistory.hasPrev()).toBe(false);
    });
});
