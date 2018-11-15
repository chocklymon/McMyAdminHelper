/*
 * McMyAdminHelper
 * http://chockly.org/
 *
 * Copyright © 2018 Curtis Oakley
 * Licensed under the MIT license.
 */
"use strict";



/* globals describe it expect CSV */
describe("CSV Tests", function () {
    // Create a forEach to use since jQuery is not defined when running the tests
    // TODO better handle the lack of jQuery
    function forEach(a, cb) {
        if (Array.isArray(a)) {
            for (var i = 0, l = a.length; i < l; i++) {
                cb(i, a[i]);
            }
        } else {
            for (var k in a) {
                if (a.hasOwnProperty(k)) {
                    cb(k, a[k]);
                }
            }
        }
    }
    var testCSV = CSV.withConfiguration(null, null, null, null, forEach);

    it("converts objects to csv", function () {
        var data = [
            {"hello": "world", "goodbye": "Moose"},
            {"rageActive": true, "hello": "Bob"},
            {"hello": "Greg", "luckyNumber": 5}
        ];
        var expected = "hello,goodbye,rageActive,luckyNumber\nworld,Moose,,\nBob,,true,\nGreg,,,5\n";

        var actual = testCSV.objsToCSV(data);

        expect(actual).toBe(expected);
    });

    it("correctly encodes values", function () {
        var data = [
            {"hello": "world", "goodbye": 'Moose, Goose, and "The Great Gatsby"'},
            {"hello": "Greg, and Meg"}
        ];
        var expected = 'hello,goodbye\nworld,"Moose, Goose, and ""The Great Gatsby"""\n"Greg, and Meg",\n';

        var actual = testCSV.objsToCSV(data);

        expect(actual).toBe(expected);
    });

    it("correctly encodes headers", function () {
        var data = [
            {"hello": "world", 'goodbye, "adios"': "Moose"},
            {"hello": "Greg, and Meg"}
        ];
        var expected = 'hello,"goodbye, ""adios"""\nworld,Moose\n"Greg, and Meg",\n';

        var actual = testCSV.objsToCSV(data);

        expect(actual).toBe(expected);
    });
});
