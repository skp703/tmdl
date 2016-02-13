/* global d3*/

var TMDL_page = (function (main_data, constants) {
    var pub = {};
    var main_data = main_data;
    var constants = constants;
    var outer_div;
    var chord_chart_div;

    pub.load = function () {
        debugger
        // main function app starts here
        console.log(main_data);
        console.log(constants);
        outer_div = d3.select(".magic");
        outer_div.html("");
        outer_div.append("div").attr("class", "filter_list").append("input").attr("type", "submit").
                on("click", reset).attr("value", "Remove filters");
        chord_chart_div = outer_div.append("div").attr("class", "chord_chart");
        init_chord();
        matrix_init(constants.models.length + constants.pollutants.length);
        // build_critical_number(outer_div, 3);
        d3.select("#nRadius").on("change", function () {
            //console.log(val)
            val = $("#nRadius").val();
            d3.select("#nRadius-value").html(val);
            filter_critical_number(val);
        });
        filter_critical_number($("#nRadius").val());
    }
    ;

    var filtered_data_all;
    var filtered_data;
    function filter_critical_number(val) {
        //reset filters
        d3.selectAll(".filter_list span").html("")
        d3.selectAll(".filtered").classed("filtered", false)
        filters = [];

        // filter array based on citical number. Critical number is the minimum number
        // of occurances (count of words, frequency) needed to qualify that report has the model in question.
        val = eval(val);
        console.log("updating critical frequency to " + val);
        // Deep copy
        filtered_data = JSON.parse(JSON.stringify(main_data));

        filtered_data.forEach(function (part, index, theArray) {
            theArray[index].hasModel = false;
            constants.models.forEach(function (model) {
                if (part[model] >= val) {
                    theArray[index][model] = 1;
                    theArray[index].hasModel = true;
                    theArray[index].likely_models =
                            !theArray[index].likely_models ? good_name(model) :
                            theArray[index].likely_models + ", " + good_name(model);
                } else {
                    theArray[index][model] = 0;
                }
            });
            constants.pollutants.forEach(function (pol) {
                if (part[pol] > 0) {
                    theArray[index][pol] = 1;
                }
            });

        });
        filtered_data = filtered_data.filter(function (d) {
            return d.hasModel;
        });
        filtered_data_all = JSON.parse(JSON.stringify(filtered_data));
        make_table(filtered_data);
    }

    function filter_category(cat) {
        d3.select(".filter_list").append("span").attr("class", "filter_token").append("span")
                .text(good_name(cat));
        filtered_data_tmp = filtered_data.filter(function (d) {
            return d[cat] === 1;
        });
        if (filtered_data_tmp.length > 0) {

            filtered_data = filtered_data_tmp;
            make_table(filtered_data);
        }
    }

    var table_var;
    function make_table(filtered_data) {
        if (table_var) {
            table_var.destroy();
        }
        // make table
        d3.select("#table_list").remove();
        t = outer_div.append("table").attr("id", "table_list").classed("nowrap stripe", true);
        //console.log(good_name("hspf"))
        //console.log(good_name("otnhuohe"))
        t_head = t.append("thead");
        t_foot = t.append("tfoot");
        t_head_r = t_head.append("tr");
        t_foot_r = t_foot.append("tr");
        constants.table_cols.forEach(function (d) {
            t_head_r.append("th").text(d);
            t_foot_r.append("th").text(d);
        });
        t_head_r.append("th").text("Likely model(s)");
        t_foot_r.append("th").text("Likely model(s)");

        t_body = t.append("tbody");
        filtered_data.forEach(function (row) {
            t_body_r = t_body.append("tr");
            constants.table_cols.forEach(function (d, i) {
                if (i === 0) {
                    // report link
                    t_body_r.append("td").html("<a href='" + row[d] + "'> report </a>");
                } else {
                    t_body_r.append("td").text(row[d]).attr("title", row[d]);
                }
            });
            t_body_r.append("td").text(row.likely_models).attr("title", row.likely_models);
        });

        table_var = $('#table_list').DataTable({
            // "paging": false,
            //"info": false,
            "order": [[2, "desc"]]
        });

        var categories = constants.models.concat(constants.pollutants);
        matrix = new Array();
        categories.forEach(function (category, cat_i) {
            tmp_filter = filtered_data.filter(function (k) {
                // filter array based on categories
                return k[category] === 1;
            });
            arr = [];
            for (j = 0; j < categories.length; j++) {
                arr.push(0);
            }
            tmp_filter.forEach(function (c) {
                categories.forEach(function (d, i) {
                    if (i !== cat_i) {
                        arr[i] = arr[i] + c[d];
                    }
                });
            });
            matrix.push(arr);
        });
        /** print matrix
         for (i = 0; i < matrix.length; i++) {
         _tmp = []
         for (j = 0; j < matrix.length; j++) {
         _tmp.push(matrix[i][j])
         }
         console.log(_tmp.join(","))
         }**/
        var gn = categories.map(good_name);
        chord_graph(matrix, gn, categories);
        matrix_update(matrix, gn, categories);
    }


    pub.good_name = good_name();
    function good_name(str) {
        // simple function to get correct names of the model
        return !constants.goodnames[str] ? str : constants.goodnames[str];
    }

    /** relegated to html page
     function build_critical_number(outer_div, val) {
     // build slider for setting the critical number
     div = outer_div.append("div").attr("class", "number_div")
     div.html('<label for="nRadius" style="display: inline-block; width: 240px; text-align: right">' +
     'cirtical frequency = <span id="nRadius-value">' + val +
     '</span></label> <input type="range" min="1" max="40" id="nRadius" value="' + val + '">');
     d3.select("#nRadius").on("change", function() {
     //console.log(val)
     val = $("#nRadius").val();
     d3.select("#nRadius-value").html(val);
     filter_critical_number(val);
     });
     }
     **/

    //plots graph
    var chord_data = {};

    function init_chord() {
        chord_data.width = 700;
        chord_data.height = 700;
        chord_data.outerRadius = Math.min(chord_data.width, chord_data.height) / 2 - 10 - 100;
        chord_data.innerRadius = chord_data.outerRadius - 18;

        chord_data.formatPercent = d3.format(".1%");

        chord_data.arc = d3.svg.arc()
                .innerRadius(chord_data.innerRadius)
                .outerRadius(chord_data.outerRadius);

        chord_data.layout = d3.layout.chord()
                .padding(.04)
                .sortSubgroups(d3.descending)
                .sortChords(d3.ascending);

        chord_data.path = d3.svg.chord()
                .radius(chord_data.innerRadius);

        chord_data.svg = chord_chart_div.append("svg")
                .attr("width", chord_data.width)
                .attr("height", chord_data.height)
                .append("g")
                .attr("id", "circle")
                .attr("transform", "translate(" + chord_data.width / 2 + "," + chord_data.height / 2 + ")");

        chord_data.svg.append("circle")
                .attr("r", chord_data.outerRadius);

        chord_data.colors = d3.scale.category20();
    }



    function chord_graph(matrix, categories, raw_categories) {

        // Compute the chord layout.
        chord_data.layout.matrix(matrix);

        // Add a group per neighborhood.
        var group_data = chord_data.svg.selectAll(".group")
                .data(chord_data.layout.groups);

        // add DOM elements to group_data if needed
        var group_data_g = group_data.enter().append("g")
                .attr("class", "group").on("mouseover", mouseover)
                .on("click", mouseclick);

        group_data_g.append("path").attr("class", function (d) {
            if (constants.pollutants.indexOf(raw_categories[d.index]) > -1) {
                return "pollutants";
            } else if (constants.models_ws.indexOf(raw_categories[d.index]) > -1) {
                return "models_ws";
            } else if (constants.models_rwc.indexOf(raw_categories[d.index]) > -1) {
                return "models_rwc";
            } else {
                return "others";
            }
        }).style("fill", function (d) {
            return chord_data.colors(d.index);
        });

        group_data_g.append("text");
        group_data_g.append("title");


        //update group_data elements
        group_data
                .select("title").text(function (d, i) {
            return categories[d.index];
        });

        group_data.exit().remove();

        // update the group arc path.
        group_data.select("path")
                .attr("id", function (d, i) {
                    return "group" + i;
                })
                .attr("d", chord_data.arc);


        // Add a text label.
        // programming question--- why use select here instead of selectAll? very important while updating graphs...I had no idea before this code!!
        // select propogates data from the parent element, selectAll will need data() and enter/update to propogate.
        // all group_data (array of 50) have only one text or path os select works and propogates updated data
        // see http://stackoverflow.com/questions/22877097/propagating-data-with-selectall-of-d3-js
        // to review enter,update, exit see the youtube video at https://github.com/curran/screencasts/tree/gh-pages/introToD3 start watching at 46 min mark
        group_data.select("text")
                .each(function (d) {
                    d.angle = (d.startAngle + d.endAngle) / 2;
                })
                .attr("dy", ".35em")
                .attr("text-anchor", function (d) {
                    return d.angle > Math.PI ? "end" : null;
                })
                .attr("transform", function (d) {
                    return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")"
                            + "translate(" + (chord_data.innerRadius + 26) + ")"
                            + (d.angle > Math.PI ? "rotate(180)" : "");
                })
                .text(function (d, i) {
                    return categories[d.index];
                });


        // Add the chords.
        var chords = chord_data.svg.selectAll(".chord")
                .data(chord_data.layout.chords);

        chords.enter().append("path")
                .attr("class", "chord");

        chords.style("fill", function (d) {
            return chord_data.colors(d.source.index);
        })
                .attr("d", chord_data.path);

        chords.exit().remove();

        function mouseover(d, i) {
            chord_data.svg.selectAll(".chord").classed("fade", function (p) {
                return p.source.index !== i && p.target.index !== i;
            });
        }
        function mouseclick(d, i, e) {
            if (d.startAngle !== d.endAngle) {
                var cat_ = raw_categories[d.index];
                if (filters.indexOf(cat_) < 0) {
                    filter_category(cat_);
                    filters.push(cat_);
                    d3.select(d3.event.currentTarget).classed("filtered", true);

                }
            }
        }
    }

    var matrix_data = {};

    function matrix_init(categories_count) {
        matrix_data.width = 700;
        matrix_data.text_len = 100;
        matrix_data.small = (matrix_data.width - matrix_data.text_len - 10) / categories_count;
        matrix_data.svg = chord_chart_div.append("svg")
                .attr("class", "matix")
                .attr("width", matrix_data.width)
                .attr("height", matrix_data.width);
        matrix_data.svg.append("g").attr("id", "matrix_gp").attr("transform", 'translate(' + matrix_data.text_len + ','
                + matrix_data.text_len + ')');
        matrix_data.svg.append("g").attr("id", "txt1");
        matrix_data.svg.append("g").attr("id", "txt2");

    }


    function matrix_update(matrix, categories, raw_categories) {

        //text
        d3.select("#txt1").attr("transform", 'translate(' + (matrix_data.text_len - 2) + ','
                + (matrix_data.text_len + matrix_data.small) + ')')
                .selectAll(".matrix_txt")
                .data(categories).enter().append("text")
                .attr("class", function (d, i) {
                    var oc = "";
                    if (constants.pollutants.indexOf(raw_categories[i]) > -1) {
                        oc = "pollutants";
                    } else if (constants.models_ws.indexOf(raw_categories[i]) > -1) {
                        oc = "models_ws";
                    } else if (constants.models_rwc.indexOf(raw_categories[i]) > -1) {
                        oc = "models_rwc";
                    } else {
                        oc = "others";
                    }
                    return "matrix_txt " + oc + "_txt";
                })
                .text(function (d) {
                    return d;
                }).style("text-anchor", "end").style("font-size", matrix_data.small)
                .attr("transform", function (d, i) {
                    return "translate(0," + i * matrix_data.small + ")";
                });

        d3.select("#txt2").attr("transform", 'translate(' + (matrix_data.text_len + matrix_data.small) + ','
                + (matrix_data.text_len - 2) + ')')
                .selectAll(".matrix_txt")
                .data(categories).enter().append("text")
                .attr("class", function (d, i) {
                    var oc = "";
                    if (constants.pollutants.indexOf(raw_categories[i]) > -1) {
                        oc = "pollutants";
                    } else if (constants.models_ws.indexOf(raw_categories[i]) > -1) {
                        oc = "models_ws";
                    } else if (constants.models_rwc.indexOf(raw_categories[i]) > -1) {
                        oc = "models_rwc";
                    } else {
                        oc = "others";
                    }
                    return "matrix_txt " + oc + "_txt";
                })
                .text(function (d) {
                    return d;
                }).style("text-anchor", "start").style("font-size", matrix_data.small)
                .attr("transform", function (d, i) {
                    return "translate(" + i * matrix_data.small + ",0)rotate(270)";
                })


        var max = d3.max(matrix, function (d) {
            return d3.max(d);
        });
        var color = d3.scale.linear()
                .domain([0, max])
                .range(["white", "black"]);

        var mg = d3.select("#matrix_gp");

        //making cols see notes on nesting https://bost.ocks.org/mike/nest/
        var cols = mg.selectAll(".matrix_col").data(matrix);
        cols.enter().append("g")
                .attr("class", function (d, i) {
                    var oc = "";
                    if (constants.pollutants.indexOf(raw_categories[i]) > -1) {
                        oc = "pollutants";
                    } else if (constants.models_ws.indexOf(raw_categories[i]) > -1) {
                        oc = "models_ws";
                    } else if (constants.models_rwc.indexOf(raw_categories[i]) > -1) {
                        oc = "models_rwc";
                    } else {
                        oc = "others";
                    }
                    return "matrix_col " + oc + "_cell";
                })
                .attr("transform", function (d, i) {

                    return "translate(" + i * matrix_data.small + "," + 0 + ")";
                });
        cols.exit().remove();
        //making cells
        var cells = cols.selectAll(".matrix_cell").data(function (d) {
            return d;
        });
        cells.enter().append("rect").
                attr("class", function (d, i) {
                    var oc = "";
                    if (constants.pollutants.indexOf(raw_categories[i]) > -1) {
                        oc = "pollutants";
                    } else if (constants.models_ws.indexOf(raw_categories[i]) > -1) {
                        oc = "models_ws";
                    } else if (constants.models_rwc.indexOf(raw_categories[i]) > -1) {
                        oc = "models_rwc";
                    } else {
                        oc = "others";
                    }
                    return "matrix_cell " + oc + "_cell";
                }).
                attr("transform", function (d, i) {

                    return "translate(" + 0 + "," + i * matrix_data.small + ")";
                }).attr("width", matrix_data.small - 1).attr("height", matrix_data.small - 1)
                .on("mouseover", matrix_mouseover).on("mouseout", matrix_mouseout);
        cells.exit().remove();

        //update cells
        d3.selectAll(".matrix_col .matrix_cell").style("fill", function (d) {
            return color(d);
        });

        function matrix_mouseover(a, b, c) {
            d3.selectAll("#txt1 text").classed("active", function (d, i) {
                return d === categories[b];
            });
            d3.selectAll("#txt2 text").classed("active", function (d, i) {
                return d === categories[c];

            });
        }
        function matrix_mouseout(a, b, c) {
            // d3.selectAll("text").classed("active", false);
        }
    }

    var filters = [];
    function reset() {
        make_table(filtered_data_all);
        filtered_data = filtered_data_all;
        d3.selectAll(".filter_list span").html("");
        d3.selectAll(".filtered").classed("filtered", false);
        filters = [];
    }
    return pub;

}
);
