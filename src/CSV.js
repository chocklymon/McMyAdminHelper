/*
 * McMyAdminHelper
 * http://chockly.org/
 *
 * Copyright © 2018 Curtis Oakley
 * Licensed under the MIT license.
 */

var CSV = (function () {
    "use strict";

    /**
     * Returns a new CSVCreator.
     * @param {string} delimiter Provide a delimiter character to use. Defaults to ','
     * @param {string} enclosure Provide an enclosure character to use. Defaults to '"'
     * @param {string} escapeChar Provide the character to escape enclosure characters with. Defaults to '"'
     * @param {string} newLine Provide the character to use for new lines. Defaults to '\n'
     * @param {function} forEach Provide a forEach function. Defaults to using jquery's $.each function.
     * @returns {{arraysToCSV: (function(Array[]): string), objsToCSV: (function(Object[]): string), toCSV: (function((Object[]|Array[]), *[], boolean): string), withConfiguration: (function(*=, *=, *=, *=, *=))}}
     * @constructor
     */
    function CSVCreator(delimiter, enclosure, escapeChar, newLine, forEach) {
        // Configuration
        delimiter = delimiter || ",";
        enclosure = enclosure || '"';
        escapeChar = escapeChar || '"';
        newLine = newLine || "\n";
        forEach = forEach || ("$" in window && "each" in $ ? $.each : function () {});

        var enclosureSearch = new RegExp(enclosure, "g");

        /**
         * Converts all arrays provided into csv.
         * @param {array[]} data An array of arrays.
         * @returns {string}
         */
        function arraysToCSV(data) {
            var headers = [],
                i;

            // Build the headers
            // The headers are simply a list of indexes
            forEach(data, function (_, row) {
                for (i = headers.length; i < row.length; i++) {
                    headers.push(i);
                }
            });

            return toCSV(data, headers, false);
        }

        /**
         * Converts all objects provided into csv.
         * @param {object[]} data An array of objects. The object keys are used to generate the headers.
         * @returns {string}
         */
        function objsToCSV(data) {
            var headers = {},
                headersSorted = [];

            // Build the headers
            // We do this so that the output has a guaranteed order
            forEach(data, function (i, row) {
                forEach(row, function (key) {
                    if (!(key in headers)) {
                        headers[key] = true;
                        headersSorted.push(key);
                    }
                });
            });

            return toCSV(data, headersSorted, true);
        }

        /**
         * Converts data to CSV.
         * @param {object[]|array[]} data An array of data values to encode to CSV
         * @param {*[]} headers An array of fields to be used as the headers. Only data values that are in the headers
         * will be included in the CSV.
         * @param {boolean} includeHeaders Indicate if the headers should be added to the CSV. Defaults to true.
         * @returns {string}
         */
        function toCSV(data, headers, includeHeaders) {
            var csv = "",
                headerLine = [];

            // Add the values for each row
            forEach(data, function (i, row) {
                var escapedRow = [];
                forEach(headers, function (_, header) {
                    if (header in row) {
                        escapedRow.push(csvEscape(row[header]));
                    } else {
                        escapedRow.push("");
                    }
                });
                csv += escapedRow.join(delimiter) + newLine;
            });

            // Add the headers
            if (includeHeaders !== false) {
                forEach(headers, function (_, header) {
                    headerLine.push(csvEscape(header));
                });
                csv = headerLine.join(delimiter) + newLine + csv;
            }
            return csv;
        }

        /**
         * Takes a parameter and returns it such that it is ready to be used as a CSV cell.
         *
         * Strings that contain the delimiter are wrapped in the enclosure and any instances of the enclosure are
         * prefixed with the escapeChar.
         *
         * Objects and arrays are converted to JSON and then escaped.
         *
         * All other types are returned as strings.
         * @param {*} str
         * @returns {string}
         */
        function csvEscape(str) {
            if (typeof str === "string" && str.indexOf(delimiter) >= 0) {
                return enclosure + str.replace(enclosureSearch, escapeChar + enclosure) + enclosure;
            }
            if (typeof str === "object") {
                return csvEscape(JSON.stringify(str));
            }
            return str.toString();
        }

        return {
            arraysToCSV: arraysToCSV,
            objsToCSV: objsToCSV,
            toCSV: toCSV,
            withConfiguration: CSVCreator
        };
    }

    return new CSVCreator();
})();
