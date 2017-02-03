/*
 * McMyAdminHelper
 * http://chockly.org/
 *
 * Copyright © 2017 Curtis Oakley
 * Licensed under the MIT license.
 */

var TableGenerator = (function () {
    "use strict";

    var removeRow;

    /**
     * Builds a row for the console helper manager interface's tables.
     * @param {array} columnDefinitions An array containing definitions for
     * each of the columns in the row.
     * @param {mixed} data The data to be inserted into the row. Optional, when
     * not set the default values for the inputs are used.
     * @returns {jQuery} The jQuery HTML element for the row.
     */
    function buildRow(columnDefinitions, data) {
        var row = $("<tr>"),
            td,
            input,
            numColumns = columnDefinitions.length,
            definition,
            column,
            result;

        // Attach the delete row button
        row.append($("<td>").append(
            $("<img>")
                .attr({
                    "src": "http://chockly.org/ch/minus.png",// Modified Fuque Icon
                    "alt": "Delete",
                    "class": "ch-delete",
                    "title": "Delete"
                })
                .click(removeRow)
            )
        );

        // Loop through the layout values
        for (var i = 0; i < numColumns; i++) {
            td = $("<td>");
            input = $("<input>");
            definition = columnDefinitions[i];

            if (typeof definition === "object") {
                column = $.extend({}, {
                    // Defaults
                    "type": "text",
                    "data": "",
                    "value": "",
                    "append": "",
                    "class": false,
                    "default": false
                }, definition);

                input.attr("type", column.type);

                // Get the value for the input field //
                if (data) {
                    // Value from the provided data
                    if (typeof column.value === "function") {
                        result = column.value(data[column.data]);
                    } else {
                        result = data[column.value];
                    }

                    // No value provided, get the default value
                } else if (column["default"]) {
                    // Use the default
                    result = column["default"];

                    // No default provided
                } else if (column.type === "checkbox") {
                    // Checkboxes default to false
                    result = false;
                } else {
                    // Other inputs default to an empty value
                    result = "";
                }

                input.attr(
                    "name",
                    (typeof column.value === "function") ? column.data : column.value
                );

                if (column.type === "checkbox") {
                    // Checkbox type
                    input.prop("checked", result);
                } else {
                    // Assume string type
                    input.attr("value", result);
                }

                // Append the pre-message
                td.text(column.append);

                // Attach the input class
                if (column["class"]) {
                    input.addClass(column["class"]);
                }
            } else {
                // Simple text field

                // Get the value
                if (data) {
                    // Use the provided value
                    result = data[definition];
                } else {
                    // Set the value to empty
                    result = "";
                }

                input.attr({
                    type: "text",
                    value: result,
                    name: definition
                });
            }
            td.append(input);
            row.append(td);
        }

        return row;
    }

    /**
     * Builds a table into the given component. Note: any existing tables inside of the
     * html element will be removed and replaced with this one.
     * @param {string} tableId The HTML id of the element.
     * @param {object} data The data to put into the table.
     * @param {object} layout The table headers and content definitions. Used
     * to map the data to the table. Consists of labels : column definition.
     * @returns {undefined}
     */
    function buildTable(tableId, data, layout) {
        // Initialize the variables
        var table = $("<table>"),
            header = $("<thead>"),
            body = $("<tbody>"),
            row,
            definitions = [],
            td;

        //   Construct the Header   //
        row = $("<tr>");

        // Add the actions column
        row.append("<th> </th>");
        // Add the headers
        $.each(layout, function (index, value) {
            row.append($("<th>").text(index));
            definitions.push(value);
        });
        header.append(row);

        //    Construct the Body    //
        if (data) {
            // Add the data
            $.each(data, function (index, value) {
                body.append(
                    buildRow(definitions, value)
                );
            });
        }

        // Attach the add new row
        row = $("<tr>");
        td = $("<td>").attr("colspan", definitions.length + 1);
        td.append(
            $("<img>").attr({
                "src": "http://chockly.org/ch/plus.png",// Modified Fuque Icon
                "alt": "Add",
                "class": "ch-add-new",
                "title": "Add"
            })
                .data("columns", definitions)
                .click(function () {
                    var jThis = $(this);
                    var tr = jThis.parent().parent(),
                        columns = jThis.data("columns");

                    tr.before(buildRow(columns));
                })
        );
        body.append(row.append(td));


        // Put it all together and attach to the page
        table.append(header);
        table.append(body);

        $("#" + tableId).find("table").remove();
        $("#" + tableId).append(table);
    }

    return {
        table: buildTable,
        setRemoveRowAction: function (fn) {
            removeRow = fn;
        }
    };
})();
