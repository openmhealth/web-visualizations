/***
 * Copyright 2015 Open mHealth
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

( function ( root, factory ) {

    var parentName = 'OMHWebVisualizations';
    root[ parentName ] = factory( root, parentName );

}( this, function ( root, parentName ) {

        var parent = root.hasOwnProperty( parentName ) ? root[ parentName ] : {};

        var Chart;

        /**
         *  Construct a new Chart object
         *  @param {{}} data - The Open mHealth formatted data to build a chart for
         *  @param {{}} element - The DOM element that contains an SVG element for the chart
         *  @param {String} measureList - The comma-delimited list of measures to search for in the data
         *  @param {{}} settings - The optional settings used to configure the function and appearance of the chart
         *  @global
         *  @constructor
         *  @classdesc This is the main class used to chart Open mHealth data. At construction time, data is parsed and Plottable.js components are used to build the chart. [Chart.renderTo]{@link Chart#renderTo} can then be called to render the chart in the browser.
         */
        Chart = function ( data, element, measureList, settings ) {

            // if the element passed in is a jQuery element, then get the dom element
            if ( typeof jQuery === 'function' && element instanceof jQuery ) {
                element = element[ 0 ];
            }
            //check if the element passed in is a d3 selection
            if ( !element.node ) {
                element = d3.select( element );
            }
            if ( !settings ) {
                settings = {};
            }

            element.classed( 'omh-chart-container', true );

            var selection;
            var measures = measureList.split( /\s*,\s*/ );
            var table = null;
            var configuration = new OMHWebVisualizations.ChartConfiguration( settings );
            var parser = new OMHWebVisualizations.DataParser( data, measures, configuration );
            var styles = new OMHWebVisualizations.ChartStyles( configuration );
            var interactions = new OMHWebVisualizations.ChartInteractions( element, measures[ 0 ], configuration, parser, styles );
            this.initialized = false;

            // set up axes
            var xScale = new Plottable.Scales.Time();
            var yScale = new Plottable.Scales.Linear();
            var yScaleCallback = null;
            var domain = configuration.getMeasureSettings( measures[ 0 ] ).yAxis.range;
            if ( domain ) {
                yScale.domainMin( domain.min ).domainMax( domain.max );
            }

            var xAxis = new Plottable.Axes.Time( xScale, 'bottom' )
                .margin( 15 )
                .addClass( 'x-axis' );

            var yAxis = new Plottable.Axes.Numeric( yScale, 'left' );

            var yLabel = new Plottable.Components.AxisLabel( configuration.getMeasureSettings( measures[ 0 ] ).yAxis.label, '0' )
                .padding( 5 )
                .xAlignment( 'right' )
                .yAlignment( 'top' );


            //create a plot with hover states for each data set
            var plots = [];

            //set up points
            var scatterPlot = new Plottable.Plots.Scatter()
                .x( function ( d ) {
                    return d.x;
                }, xScale )
                .y( function ( d ) {
                    return d.y;
                }, yScale );

            styles.setStylesForPlot( styles.getConfiguredDefaultStylesForPlot( scatterPlot ), scatterPlot );

            //prepare for clustered bars
            var clusteredBarPlots = [];
            var clusteredBarPlotCount = 0;
            var secondaryYAxes = [];
            d3.entries( parser.getAllMeasureData() ).forEach( function ( entry ) {
                var measure = entry.key;
                if ( configuration.getMeasureSettings( measure ).chart.type === 'clustered_bar' ) {
                    clusteredBarPlotCount++;
                }
            } );

            // If there are gridlines, add them
            var gridlineValues = [];
            var gridlines;
            var gridlineYAxis;

            measures.forEach( function ( measure ) {

                var measureSettings = configuration.getMeasureSettings( measure );

                if ( measureSettings.chart && measureSettings.chart.gridlines ) {
                    var measureGridlines = measureSettings.chart.gridlines;
                    measureGridlines.forEach( function ( gridline ) {
                        if ( !gridline.hasOwnProperty( 'visible' ) || gridline.visible === true ) {
                            gridlineValues.push( gridline );
                        }
                    } );
                }

            } );

            if ( gridlineValues.length > 0 ) {

                gridlineValues.sort( function ( a, b ) {
                    return a.value - b.value;
                } );

                var gridlineYScale = new Plottable.Scales.Linear();
                gridlineYScale.domain( yScale.domain() );
                gridlineYScale.range( yScale.range() );
                yScaleCallback = function ( updatedScale ) {
                    gridlineYScale.domain( updatedScale.domain() );
                    gridlineYScale.range( updatedScale.range() );
                };
                yScale.onUpdate( yScaleCallback );
                var yScaleTickGenerator = function ( scale ) {
                    var ticks = gridlineValues.map( function ( element ) {
                        return element.value;
                    } );
                    return ticks;
                };

                gridlineYScale.tickGenerator( yScaleTickGenerator );

                gridlineYAxis = new Plottable.Axes.Numeric( gridlineYScale, "right" )
                    .tickLabelPosition( "top" )
                    .tickLabelPadding( 1 )
                    .showEndTickLabels( true )
                    .addClass( 'gridlines-axis' );

                gridlineYAxis.formatter( function ( value ) {
                    for ( var index in gridlineValues ) {
                        if ( gridlineValues[ index ].value === value ) {
                            var label = gridlineValues[ index ].label ? gridlineValues[ index ].label : gridlineValues[ index ].value;
                            return String( label );
                        }
                    }
                } );

                gridlines = new Plottable.Components.Gridlines( null, gridlineYScale );

                plots.push( gridlines );
                plots.push( gridlineYAxis );

            }

            //iterate across the measures and add plots
            measures.forEach( function ( measure ) {

                if ( !parser.hasMeasureData( measure ) ) {
                    return;
                }

                var data = parser.getMeasureData( measure );

                var dataset = new Plottable.Dataset( data );
                var measureSettings = configuration.getMeasureSettings( measure );

                dataset.measure = measure;

                if ( measureSettings.chart.type === 'clustered_bar' ) {

                    //because datasets cannot have different scales in the clustered bars
                    //multiple plots are added, each with all but one dataset zeroed out,
                    //and each with a different scale and its own y axis

                    var barYScale = yScale;
                    if ( clusteredBarPlots.length > 0 ) {
                        var domain = measureSettings.yAxis.range;
                        var label = measureSettings.yAxis.label;
                        barYScale = new Plottable.Scales.Linear()
                            .domainMin( domain.min ).domainMax( domain.max );
                        var barYAxis = new Plottable.Axes.Numeric( barYScale, 'right' );
                        var barYLabel = new Plottable.Components.AxisLabel( label, '0' )
                            .padding( 5 )
                            .xAlignment( 'left' )
                            .yAlignment( 'top' );
                        secondaryYAxes.push( {
                            'measure': measure,
                            'axis': barYAxis,
                            'label': barYLabel,
                            'scale': barYScale
                        } );
                    }

                    var clusteredBarPlot = new Plottable.Plots.ClusteredBar()
                        .x( function ( d ) {
                            return d.x;
                        }, xScale )
                        .y( function ( d ) {
                            return d.y;
                        }, barYScale );

                    styles.setStylesForPlot( styles.getConfiguredDefaultStylesForPlot( clusteredBarPlot ), clusteredBarPlot );

                    clusteredBarPlots.push( clusteredBarPlot );

                    for ( var i = 0; i < clusteredBarPlotCount; i++ ) {

                        //add blank data for all but one of the datasets
                        if ( i === clusteredBarPlots.length - 1 ) {
                            clusteredBarPlot.addDataset( dataset );
                        } else {
                            clusteredBarPlot.addDataset( new Plottable.Dataset( [] ) );
                        }

                    }

                    //prevent time axis from showing detail past the day level
                    var axisConfigs = xAxis.axisConfigurations();
                    var filteredAxisConfigs = [];
                    axisConfigs.forEach( function ( config ) {
                        if ( config[ 0 ].interval === 'day' || config[ 0 ].interval === 'month' || config[ 0 ].interval === 'year' ) {
                            filteredAxisConfigs.push( config );
                        }
                    } );
                    xAxis.axisConfigurations( filteredAxisConfigs );

                    clusteredBarPlot.addClass( 'clustered-bar-plot-' + measure );
                    plots.push( clusteredBarPlot );

                } else {

                    //set up lines that connect the dots
                    var linePlot = new Plottable.Plots.Line()
                        .x( function ( d ) {
                            return d.x;
                        }, xScale )
                        .y( function ( d ) {
                            return d.y;
                        }, yScale );

                    styles.setStylesForPlot( styles.getConfiguredDefaultStylesForPlot( linePlot ), linePlot );

                    //add data
                    linePlot.addDataset( dataset );
                    scatterPlot.addDataset( dataset );

                    //prepare for plot group
                    linePlot.addClass( 'line-plot-' + measure );
                    plots.push( linePlot );

                }

            } );

            // scatter plot is always added regardless of chart type
            // because Pointer interactions are attached to it
            scatterPlot.addClass( 'point-plot' );
            plots.push( scatterPlot );

            var colorScale = null;
            var legend = null;
            var legendSettings = configuration.getInterfaceSettings().legend;
            if ( legendSettings && legendSettings.visible ) {

                //add legend
                colorScale = new Plottable.Scales.Color();
                legend = new Plottable.Components.Legend( colorScale );
                var names = [];
                var colors = [];

                d3.entries( parser.getAllMeasureData() ).forEach( function ( entry ) {

                    var measure = entry.key;
                    var measureSettings = configuration.getMeasureSettings( measure );
                    var name = measureSettings.legend.seriesName;
                    var color = measureSettings.legend.seriesColor;

                    if ( name && color ) {
                        names.push( name );
                        colors.push( color );
                    }

                } );
                colorScale.domain( names );
                colorScale.range( colors );
                legend.maxEntriesPerRow( 2 );
                legend.symbol( Plottable.SymbolFactories.square );
                legend.xAlignment( "right" );
                legend.yAlignment( "top" );
                plots.push( legend );

            }


            //build table
            var xAxisVisible = configuration.getInterfaceSettings().axes.xAxis.visible;
            var yAxisVisible = configuration.getInterfaceSettings().axes.yAxis.visible;
            var plotGroup = new Plottable.Components.Group( plots );
            var yAxisGroup = yAxisVisible ? new Plottable.Components.Group( [ yAxis, yLabel ] ) : null;
            var topRow = [ yAxisGroup, plotGroup ];
            var bottomRow = [ null, xAxisVisible ? xAxis : null ];
            if ( yAxisVisible ) {
                secondaryYAxes.forEach( function ( axisComponents ) {
                    topRow.push( new Plottable.Components.Group( [ axisComponents.axis, axisComponents.label ] ) );
                    bottomRow.push( null );
                } );
            }
            table = new Plottable.Components.Table( [
                topRow,
                bottomRow
            ] );
            table.yAlignment( 'bottom' );

            interactions.addToComponents( {
                'plots': plots,
                'plotGroup': plotGroup,
                'table': table,
                'xScale': xScale,
                'xAxis': xAxis
            } );

            /**
             *  Destroy the resources used to render this chart
             */
            this.destroy = function () {
                interactions.destroy();
                table && table.destroy();
                yScaleCallback && yScale.offUpdate( yScaleCallback );
            };

            /**
             * Get the Plottable.js chart components
             * @returns {{}}
             */
            this.getComponents = function () {

                if ( !this.initialized ) {
                    return {};
                }

                //init the axes, scales, and labels objects with the default measure components
                var yScales = {};
                yScales[ measures[ 0 ] ] = yScale;
                var yAxes = {};
                yAxes[ measures[ 0 ] ] = yAxis;
                var yLabels = {};
                yLabels[ measures[ 0 ] ] = yLabel;
                var xScales = {};
                xScales[ measures[ 0 ] ] = xScale;
                var xAxes = {};
                xAxes[ measures[ 0 ] ] = xAxis;
                var colorScales = {};
                colorScales[ measures[ 0 ] ] = colorScale;

                //populate the axes, scales, and labels objects with the secondary measure components
                secondaryYAxes.forEach( function ( axisComponents ) {
                    yScales[ axisComponents.measure ] = axisComponents.scale;
                    yAxes[ axisComponents.measure ] = axisComponents.axis;
                    yLabels[ axisComponents.measure ] = axisComponents.label;
                } );

                return {
                    'xScales': xScales,
                    'yScales': yScales,
                    'colorScales': colorScales,
                    'gridlines': {
                        'gridlines': gridlines,
                        'yAxis': gridlineYAxis,
                        'values': gridlineValues
                    },
                    'legends': [ legend ],
                    'xAxes': xAxes,
                    'yAxes': yAxes,
                    'plots': plots,
                    'yLabels': yLabels,
                    'table': table,
                    'tooltip': interactions.getTooltip(),
                    'toolbar': interactions.getToolbar(),
                    'panZoomInteractions': {
                        'plotGroup': interactions.getPanZoomInteraction(),
                        'xAxis': interactions.getpanZoomInteractionXAxis()
                    }
                };

            };

            /**
             * Get the plots that are shown in this chart as Plottable.js components
             * @param {Plottable.Plots.XYPlot} plotClass - Optional parameter gets only plots of the type, eg Plottable.Plots.Scatter
             * @returns {Array}
             */
            this.getPlots = function ( plotClass ) {
                if ( plotClass ) {
                    return plots.filter( function ( plot ) {
                        return plot instanceof plotClass;
                    } );
                } else {
                    return plots;
                }
            };

            /**
             * Add a gridline to the chart at the value
             * @param {number} value - The location on the y axis of the gridline
             * @param {String} label - The label of the gridline. Optional, defaults to the value.
             */
            this.addGridline = function ( value, label ) {
                gridlineValues.push( { value: value, label: label ? label : value } );
            };

            /**
             * Get the measures that this chart can show
             * @returns {Array}
             */
            this.getMeasures = function () {
                return measures;
            };

            /**
             * Get styles used to render the plots
             * @returns {ChartStyles}
             */
            this.getStyles = function () {
                return styles;
            };

            /**
             * Get the interactions used to present the plots
             * @returns {ChartInteractions}
             */
            this.getInteractions = function () {
                return interactions;
            };
            /**
             * Get the configuration used to render the plots
             * @returns {ChartConfiguration}
             */
            this.getConfiguration = function () {
                return configuration;
            };
            /**
             * Get the parser used to process the data
             * @returns {DataParser}
             */
            this.getParser = function () {
                return parser;
            };

            /**
             * Get the D3 selection that this chart is rendered to
             * @returns {d3.Selection}
             */
            this.getD3Selection = function () {
                return selection;
            };

            /**
             * Render the chart to the SVG DOM element
             * @param {Object} svgElement - The SVG DOM element that will contain the chart elements
             */
            this.renderTo = function ( svgElement ) {

                if ( !this.initialized ) {
                    console.log( "Warning: chart could not be rendered because it was not successfully initialized." );
                    return;
                }

                //invoke the tip in the context of the chart
                selection = d3.select( svgElement );

                //add interactions
                interactions.addToSelection( selection );

                //render the table
                table.renderTo( selection );

                //add any needed styles to the selection
                styles.addToSelection( selection );

                //add tooltips to rendered point plot entities
                interactions.addTooltipsToEntities( scatterPlot.entities() );

            };

            this.initialized = true;

        }
        ;

        parent.Chart = Chart;

        return parent;

    }
) )
;


( function ( root, factory ) {

    var parentName = 'OMHWebVisualizations';
    root[ parentName ] = factory( root, parentName );

}( this, function ( root, parentName ) {

    var parent = root.hasOwnProperty( parentName ) ? root[ parentName ] : {};

    var ChartConfiguration;

    /**
     * Constructs a new ChartConfiguration object
     * @classdesc This class generates and manages configuration state for a chart. The configuration is passed in a an object containing optional settings.
     * @param {{}} settings - An object containing properties that configure the chart
     * @constructor
     * @global
     * @example
     * // An example of the settings parameter
     {
         'interface': {
             'toolbar': {
                 'visible': true,
                 'timespanButtons': { 'visible': true },
                 'zoomButtons': { 'visible': true },
                 'navigationButtons': { 'visible': true }
             },
             'tooltips': {
                 'visible': true,
                 'timeFormat': 'M/D/YY, h:mma',
                 'decimalPlaces': 0,
                 'contentFormatter': ChartStyles.formatters.defaultTooltip.bind( this ),
                 'grouped': true
             },
             'panZoomUsingMouse': {
                 'enabled': true,
                 'hint':{
                     'visible': true
                 }
             },
             'axes': {
                 'yAxis': {
                     'visible': true
                 },
                 'xAxis': {
                     'visible': true
                 }
             }
         },
         'measures': {
             'body_weight': {
                 'data': {
                     'yValuePath': 'body.body_weight.value',
                 },
                 'yAxis': {
                     'range': { 'min': 0, 'max': 100 },
                     'label': 'kg'
                 }
             },
             'heart_rate': {
                 'data':{
                     'yValuePath': 'body.heart_rate.value'
                 },
                 'yAxis': {
                     'range': { 'min': 30, 'max': 150 },
                     'label': 'bpm'
                 }
             },
             'step_count': {
                 'data': {
                     'yValuePath': 'body.step_count',
                     'xValueQuantization': {
                         'period': DataParser.QUANTIZE_DAY,
                         'aggregator': parent.DataParser.aggregators.sum
                     }
                 },
                 'chart': {
                     'type': 'clustered_bar',
                     'daysShownOnTimeline': { 'min': 7, 'max': 90 }
                 },
                 'legend': {
                     'seriesName': 'Steps',
                     'seriesColor': '#eeeeee'
                 },
                 'yAxis': {
                     'range': { 'min': 0, 'max': 1500 },
                     'label': 'Steps'
                 }
             },
             'minutes_moderate_activity': {
                 'data':{
                     'yValuePath': 'body.minutes_moderate_activity.value',
                     'xValueQuantization': {
                         'period': DataParser.QUANTIZE_DAY,
                         'aggregator': DataParser.aggregators.sum
                     }
                 },
                 'chart': {
                     'type': 'clustered_bar',
                     'daysShownOnTimeline': { 'min': 7, 'max': 90 }
                 },
                 'legend': {
                     'seriesName': 'Minutes of moderate activity',
                     'seriesColor': '#4a90e2'
                 },
                 'yAxis':{
                     'range': { 'min': 0, 'max': 300 },
                     'label': 'Minutes'
                 }
             },
             'systolic_blood_pressure': {
                 'data': {
                     'yValuePath': 'body.systolic_blood_pressure.value'
                 },
                 'yAxis': {
                     'range': { 'min': 30, 'max': 200 },
                     'label': 'mmHg'
                 }
             },
             'diastolic_blood_pressure': {
                 'data': {
                     'yValuePath': 'body.diastolic_blood_pressure.value'
                 },
                 'yAxis':{
                     'range': { 'min': 30, 'max': 200 },
                     'label': 'mmHg'
                 }
             }
         }
     }
     */
    ChartConfiguration = function ( settings ) {

        var mergedSettings;
        var measureNames;

        var defaultSettings = {
            'interface': {
                'toolbar': {
                    'visible': true,
                    'timespanButtons': { 'visible': true },
                    'zoomButtons': { 'visible': true },
                    'navigationButtons': { 'visible': true }
                },
                'tooltips': {
                    'visible': true,
                    'timeFormat': 'M/D/YY, h:mma',
                    'decimalPlaces': 0,
                    'contentFormatter': parent.ChartStyles.formatters.defaultTooltip.bind( this ),
                    'grouped': true
                },
                'panZoomUsingMouse': {
                    'enabled': true,
                    'hint': {
                        'visible': true
                    }
                },
                'axes': {
                    'yAxis': {
                        'visible': true
                    },
                    'xAxis': {
                        'visible': true
                    }
                }
            },
            'measures': {
                'body_weight': {
                    'data': {
                        'yValuePath': 'body.body_weight.value',
                    },
                    'yAxis': {
                        'range': { 'min': 0, 'max': 100 },
                        'label': 'kg'
                    }
                },
                'heart_rate': {
                    'data': {
                        'yValuePath': 'body.heart_rate.value'
                    },
                    'yAxis': {
                        'range': { 'min': 30, 'max': 150 },
                        'label': 'bpm'
                    }
                },
                'step_count': {
                    'data': {
                        'yValuePath': 'body.step_count',
                        'xValueQuantization': {
                            'period': parent.DataParser.QUANTIZE_DAY,
                            'aggregator': parent.DataParser.aggregators.sum
                        }
                    },
                    'chart': {
                        'type': 'clustered_bar',
                        'daysShownOnTimeline': { 'min': 7, 'max': 90 }
                    },
                    'legend': {
                        'seriesName': 'Steps',
                        'seriesColor': '#eeeeee'
                    },
                    'yAxis': {
                        'range': { 'min': 0, 'max': 1500 },
                        'label': 'Steps'
                    }
                },
                'minutes_moderate_activity': {
                    'data': {
                        'yValuePath': 'body.minutes_moderate_activity.value',
                        'xValueQuantization': {
                            'period': parent.DataParser.QUANTIZE_DAY,
                            'aggregator': parent.DataParser.aggregators.sum
                        }
                    },
                    'chart': {
                        'type': 'clustered_bar',
                        'daysShownOnTimeline': { 'min': 7, 'max': 90 }
                    },
                    'legend': {
                        'seriesName': 'Minutes of moderate activity',
                        'seriesColor': '#4a90e2'
                    },
                    'yAxis': {
                        'range': { 'min': 0, 'max': 300 },
                        'label': 'Minutes'
                    }
                },
                'systolic_blood_pressure': {
                    'data': {
                        'yValuePath': 'body.systolic_blood_pressure.value'
                    },
                    'yAxis': {
                        'range': { 'min': 30, 'max': 200 },
                        'label': 'mmHg'
                    }
                },
                'diastolic_blood_pressure': {
                    'data': {
                        'yValuePath': 'body.diastolic_blood_pressure.value'
                    },
                    'yAxis': {
                        'range': { 'min': 30, 'max': 200 },
                        'label': 'mmHg'
                    }
                }
            }
        };

        var genericMeasureDefaults = {
            'yAxis': {
                'range': { 'min': 0, 'max': 100 },
                'label': 'Units'
            },
            'data': {
                'xValueQuantization': {
                    'period': parent.DataParser.QUANTIZE_NONE,
                    'aggregator': parent.DataParser.aggregators.mean
                }
            },
            'chart': {
                'type': 'line',
                'daysShownOnTimeline': { 'min': 1, 'max': 1000 }
            },
            'legend': {
                'seriesName': 'Series',
                'seriesColor': '#4a90e2'
            }
        };

        var initialize = function () {

            mergedSettings = parent.Utils.mergeObjects( defaultSettings, settings );
            measureNames = Object.keys( mergedSettings.measures );

            measureNames.forEach( function ( measure ) {
                mergedSettings.measures[ measure ] = parent.Utils.mergeObjects( genericMeasureDefaults, mergedSettings.measures[ measure ] );
            } );

        };

        this.getConfiguredMeasureNames = function () {
            return Object.keys( mergedSettings.measures );
        };

        /**
         * Get the settings for the measure passed in
         * @param {String} measure - A measure name, such as 'systolic_blood_pressure'
         * @returns {{}}
         */
        this.getMeasureSettings = function ( measure ) {
            return mergedSettings.measures[ measure ];
        };

        /**
         * Get the settings for the user interface
         * @returns {{}}
         */
        this.getInterfaceSettings = function () {
            return mergedSettings.interface;
        };

        // Initialize the ChartConfiguration
        initialize.call( this );

    };

    parent.ChartConfiguration = ChartConfiguration;

    return parent;

} ) );

( function ( root, factory ) {

    var parentName = 'OMHWebVisualizations';
    root[ parentName ] = factory( root, parentName );

}( this, function ( root, parentName ) {

        var parent = root.hasOwnProperty( parentName ) ? root[ parentName ] : {};

        var ChartInteractions;

        /**
         * Construct a ChartInteractions object
         * @param {{}} element - the DOM element containing the svg that the chart is rendered to
         * @param {String} primaryMeasure - the measure that will serve as the basis for any adaptive aspects of the interface
         * @param {ChartConfiguration} configuration - the ChartConfiguration that configures the chart that these interactions will be connected to
         * @param {DataParser} parser - the parser that parsed the data in the chart
         * @param {ChartStyles} styles - the ChartStyles that style this chart
         * @constructor
         * @global
         * @classdesc This class allocates and maintains and destroys resources for user interactions on the chart.
         */
        ChartInteractions = function ( element, primaryMeasure, configuration, parser, styles ) {

            var MS_PER_DAY = 86400000;

            var settings = configuration.getInterfaceSettings();

            // callbacks and vars for drag
            var dragInteraction;
            var dragCallback;

            // callbacks and vars for mousewheel
            var mouseWheelCallback;
            var mouseWheelDispatcher;

            // callbacks and vars for panning and zooming
            var panZoomHint;
            var panZoomInteraction;
            var panZoomInteractionXAxis;
            var minZoomDays;
            var maxZoomDays;
            var xScale;

            // the toolbar that lets users navigate time
            var toolbar;

            // callback for hiding hint is used in more than one place
            var hidePanZoomHint;

            // callbacks and vars for hover points
            var pointer;
            var tooltip;
            var tooltipHoverPointEntities = {};
            var entityHoverGroups = {};
            var highlightNewHoverPoint;
            var showHoverPointTooltip;
            var pointerMove;

            // these references are kept so that interactions can be destroyed
            var pointerPlot;
            var table;

            // keep the selection so that it can be checked for bounds
            var selection;

            var setZoomLevelByDays = function ( timeInDays ) {

                if ( minZoomDays ) {
                    timeInDays = Math.max( timeInDays, minZoomDays );
                }
                if ( maxZoomDays ) {
                    timeInDays = Math.min( timeInDays, maxZoomDays );
                }

                var currentDomain = xScale.domain();
                var extents = [ currentDomain[ 0 ], new Date( currentDomain[ 0 ].getTime() + timeInDays * MS_PER_DAY ) ];
                xScale.domain( extents );

            };

            // get the number of days covered by the domain
            var getTimeInDays = function ( domain ) {

                return ( domain[ 1 ].getTime() - domain[ 0 ].getTime() ) / MS_PER_DAY;

            };

            var setZoomLevelByPercentageIncrement = function ( percentage ) {

                var domain = xScale.domain();

                var timeInDays = getTimeInDays( domain );

                timeInDays *= ( 100 - percentage ) / 100;

                if ( minZoomDays ) {
                    timeInDays = Math.max( timeInDays, minZoomDays );
                }
                if ( maxZoomDays ) {
                    timeInDays = Math.min( timeInDays, maxZoomDays );
                }

                var extents = [ domain[ 0 ], new Date( domain[ 0 ].getTime() + timeInDays * MS_PER_DAY ) ];
                xScale.domain( extents );

            };

            var shiftVisibleTimeByPercentageIncrement = function ( percentage ) {

                var domain = xScale.domain();

                var timeInDays = getTimeInDays( domain );

                timeInDays *= percentage / 100;

                var extents = [ new Date( domain[ 0 ].getTime() + timeInDays * MS_PER_DAY ), new Date( domain[ 1 ].getTime() + timeInDays * MS_PER_DAY ) ];
                xScale.domain( extents );

            };

            var clearZoomLevelButtonActiveStates = function () {
                d3.selectAll( '.time-button' ).classed( 'active', false );
            };

            var attachTooltipsToPlot = function ( plot ) {

                //set up plottable's hover-based point selection interaction
                pointer = new Plottable.Interactions.Pointer();

                pointer.onPointerExit( function ( p ) {
                    tooltip.hide();
                } );
                pointer.onPointerEnter( showHoverPointTooltip.bind( this ) );

                //add to pointer Interactions
                pointerMove = function ( p ) {
                    var nearestEntity;
                    try {
                        nearestEntity = plot.entityNearest( p );
                        highlightNewHoverPoint( nearestEntity );
                        showHoverPointTooltip();
                    } catch ( e ) {
                        return;
                    }
                };

                pointer.onPointerMove( pointerMove );
                pointer.attachTo( plot );

                pointerPlot = plot; //save so pointer can be destroyed later

            };

            var attachPanZoomInteractionToComponents = function ( components ) {

                //set up pan/zoom
                panZoomInteraction = new Plottable.Interactions.PanZoom();
                panZoomInteractionXAxis = new Plottable.Interactions.PanZoom();

                panZoomInteraction.addXScale( components.xScale );
                panZoomInteraction.attachTo( components.plotGroup );
                panZoomInteractionXAxis.addXScale( components.xScale );
                panZoomInteractionXAxis.attachTo( components.xAxis );

                if ( minZoomDays ) {
                    panZoomInteraction.minDomainExtent( components.xScale, minZoomDays * MS_PER_DAY );
                    panZoomInteractionXAxis.minDomainExtent( components.xScale, minZoomDays * MS_PER_DAY );
                }

                if ( maxZoomDays ) {
                    panZoomInteraction.maxDomainExtent( components.xScale, maxZoomDays * MS_PER_DAY );
                    panZoomInteractionXAxis.maxDomainExtent( components.xScale, maxZoomDays * MS_PER_DAY );
                }

            };

            var limitScaleExtents = function ( xScale ) {

                //limit the width of the timespan on load so that bars do not get too narrow
                var measureExtentsData = [];
                d3.entries( parser.getAllMeasureData() ).forEach( function ( entry ) {
                    var data = entry.value;
                    data.forEach( function ( datum ) {
                        measureExtentsData.push( datum.x );
                    } );
                } );
                var measureExtents = xScale.extentOfValues( measureExtentsData );
                var fullExtentMs = measureExtents[ 1 ].getTime() - measureExtents[ 0 ].getTime();
                var maxMs = maxZoomDays * MS_PER_DAY;
                if ( fullExtentMs > maxMs ) {
                    measureExtents[ 1 ] = new Date( measureExtents[ 0 ].getTime() + maxMs );
                }
                xScale.domain( measureExtents );

            };


            /*
             *
             * Initialization functions
             *
             * */

            var initializeDragInteraction = function () {

                //make the tooltip follow the plot on pan...
                dragInteraction = new Plottable.Interactions.Drag();
                dragCallback = function () {
                    hidePanZoomHint && hidePanZoomHint();
                    ( tooltip && showHoverPointTooltip ) && showHoverPointTooltip();
                };
                dragInteraction.onDrag( dragCallback );

            };

            var initializeMouseWheelInteraction = function () {
                //...and on zoom
                mouseWheelCallback = function () {
                    showHoverPointTooltip && showHoverPointTooltip();
                    clearZoomLevelButtonActiveStates && clearZoomLevelButtonActiveStates();
                    hidePanZoomHint && hidePanZoomHint();
                };//this is added to the selection when the chart is rendered
            };


            var initializePanZoomInteraction = function () {

                panZoomHint = new Plottable.Components.Label( '( Drag chart to pan, pinch or scroll to zoom )', 0 )
                    .padding( 10 )
                    .yAlignment( 'bottom' )
                    .xAlignment( 'right' )
                    .addClass( 'zoom-hint-label' );

                hidePanZoomHint = function () {
                    panZoomHint.addClass( 'hidden' );
                };

                var pziHintClickInteraction = new Plottable.Interactions.Click()
                    .attachTo( panZoomHint )
                    .onClick( function ( point ) {
                        hidePanZoomHint();
                    } );

                //limit the width of the timespan
                //eg so that bars do not have times under them etc
                var limits = configuration.getMeasureSettings( primaryMeasure ).chart.daysShownOnTimeline;
                minZoomDays = limits ? limits.min : false;
                maxZoomDays = limits ? limits.max : false;

            };

            var initializeToolbarInteraction = function () {

                if ( settings.toolbar.visible ) {
                    toolbar = element.append( "div" )
                        .classed( 'omh-chart-toolbar', true )
                        .attr( 'unselectable', 'on' );

                    if ( settings.toolbar.timespanButtons.visible ) {

                        var zoomLevels = {
                            '1wk': 7,
                            '1m': 30,
                            '3m': 90,
                            '6m': 180,
                        };
                        toolbar.append( "span" ).classed( "time-buttons-label", true ).text( "Show: " );
                        d3.entries( zoomLevels ).forEach( function ( entry ) {
                            var days = entry.value;
                            var label = entry.key;
                            if ( ( !maxZoomDays || days <= maxZoomDays ) && ( !minZoomDays || days >= minZoomDays ) ) {
                                var $button = toolbar.append( "span" ).classed( 'time-button', true ).text( label );
                                $button.on( 'click', function () {
                                    clearZoomLevelButtonActiveStates();
                                    setZoomLevelByDays( days );
                                    d3.select( this ).classed( 'active', true );
                                } );
                            }
                        } );

                    }

                    if ( settings.toolbar.zoomButtons.visible ) {

                        var zoomPercentageIncrements = {
                            '&#8722;': -20,
                            '&#43;': 20,
                        };
                        toolbar.append( "span" ).classed( 'zoom-buttons-label', true ).text( ' Zoom: ' );
                        d3.entries( zoomPercentageIncrements ).forEach( function ( entry ) {
                            var percentageIncrement = entry.value;
                            var label = entry.key;

                            var $button = toolbar.append( 'span' ).classed( 'zoom-button', true ).html( label );
                            $button.on( 'click', function () {
                                clearZoomLevelButtonActiveStates();
                                setZoomLevelByPercentageIncrement( percentageIncrement );
                            } );
                        } );

                    }

                    if ( settings.toolbar.navigationButtons.visible ) {
                        var $prevButton = toolbar.append( 'span', ":first-child" ).classed( 'previous-time-period-button', true ).text( '< prev' );
                        $prevButton.on( 'click', function () {
                            shiftVisibleTimeByPercentageIncrement( -100 );
                        } );

                        var $nextButton = toolbar.append( 'span' ).classed( 'next-time-period-button', true ).text( 'next >' );
                        $nextButton.on( 'click', function () {
                            shiftVisibleTimeByPercentageIncrement( 100 );
                        } );
                    }

                }

            };

            var initializeTooltipInteraction = function () {

                if ( settings.tooltips.visible ) {

                    //set up hover

                    //the last point to show a hover state is stored in this variable
                    var hoverPoint = null;

                    //change the appearance of a point on hover
                    var hoverPointOpacity = null;
                    var highlightPoint = function ( entity ) {
                        hoverPointOpacity = entity.selection.style( 'opacity' );
                        entity.selection.style( 'opacity', '1' );
                    };
                    var resetPoint = function ( entity ) {
                        entity.selection.style( 'opacity', hoverPointOpacity );
                    };

                    // change an entire group of points' appearances on hover
                    // e.g. both the systolic and diastolic bp readings in a datum body
                    var highlightGroup = function ( groupName, index ) {
                        entityHoverGroups[ groupName ][ index ].forEach( function ( p ) {
                            highlightPoint( p );
                        } );
                    };
                    var resetGroup = function ( groupName, index ) {
                        entityHoverGroups[ groupName ][ index ].forEach( function ( p ) {
                            resetPoint( p );
                        } );
                    };

                    var showToolTip = function ( entity ) {
                        tooltip.show( entity.datum, entity.selection[ 0 ][ 0 ] );
                    };

                    // only show the tooltip if the entity is inside the chart bounds
                    // this is important when panning while hovering,
                    // since the point may leave the chart bounds
                    var showTooltipIfInBounds = function ( entity ) {
                        if ( entity && selection ) {
                            if ( entity.selection[ 0 ][ 0 ].getBoundingClientRect().left >
                                selection[ 0 ][ 0 ].getBoundingClientRect().left &&
                                entity.selection[ 0 ][ 0 ].getBoundingClientRect().right <
                                selection[ 0 ][ 0 ].getBoundingClientRect().right
                            ) {
                                showToolTip( entity );
                            } else {
                                tooltip.hide();
                            }
                        }
                    };

                    // the callback that shows the tooltip for a point
                    showHoverPointTooltip = function () {
                        if ( hoverPoint && selection ) {
                            if ( hoverPoint.datum.primary || !settings.tooltips.grouped ) {
                                showTooltipIfInBounds( hoverPoint );
                            } else {
                                var groupHoverPoint = tooltipHoverPointEntities[ hoverPoint.datum.omhDatum.groupName ][ hoverPoint.index ];
                                var tipHeight = d3.select( '.d3-tip' ).node().clientHeight;
                                if ( groupHoverPoint.selection[ 0 ][ 0 ].getBoundingClientRect().top >
                                    selection[ 0 ][ 0 ].getBoundingClientRect().top + tipHeight ) {
                                    showTooltipIfInBounds( groupHoverPoint );
                                } else {
                                    showTooltipIfInBounds( hoverPoint );
                                }
                            }
                        }
                    };

                    // this function manages the reference to the point that the user is hovering on
                    highlightNewHoverPoint = function ( point ) {
                        if ( hoverPoint !== null ) {

                            // When tooltips are grouped, update the hover point if the point passed in
                            // has a different body from the current hover point

                            // When tooltips are not grouped, also check if the measure type has changed,
                            // since two points of different types can share the same body (eg diastolic and systolic bp)

                            var groupTooltips = settings.tooltips.grouped;
                            var bodyChanged = point.datum.omhDatum.body !== hoverPoint.datum.omhDatum.body;
                            var measureTypeChanged = point.datum.measure !== hoverPoint.datum.measure;
                            var pointChanged = groupTooltips ? bodyChanged : (bodyChanged || measureTypeChanged);

                            if ( pointChanged ) {
                                resetGroup( hoverPoint.datum.omhDatum.groupName, hoverPoint.index );
                                hoverPoint = point;
                                highlightGroup( hoverPoint.datum.omhDatum.groupName, point.index );
                            }

                        } else {
                            hoverPoint = point;
                        }
                        if ( point.datum === null ) {
                            return;
                        }
                    };

                    //define tooltip html content based on data point
                    var getTipContent = function ( d ) {

                        //show different tool tip depending on content formatter
                        var formattedData;
                        if ( settings.tooltips && typeof( settings.tooltips.contentFormatter ) !== 'undefined' ) {
                            formattedData = settings.tooltips.contentFormatter( d );
                        } else {
                            var decimalPlaces = typeof( settings.decimalPlaces ) !== 'undefined' ? settings.decimalPlaces : 1;
                            formattedData = d.y.toFixed( decimalPlaces );
                        }

                        var content = '<div class="value">' + formattedData + '</div>';

                        var timeFormat = settings.tooltips.timeFormat;
                        content += '<div class="time">' + moment( d.x ).format( timeFormat ) + '</div>';
                        content += '<div class="provider">' + d.provider + '</div>';
                        return content;

                    };

                    //initialize the tooltip
                    tooltip = d3.tip().attr( 'class', 'd3-tip' ).html( function ( d ) {

                        // this function is called by tooltip.show()
                        // tooltip.show() is called after the hoverpoint has been set,
                        // so the hoverpoint contains a reference to the plot containing the point

                        var plot = hoverPoint.component;
                        var className = styles.resolveStyleNameForDatumInPlot( d, plot );
                        className = className.toLowerCase().replace( /[^a-z0-9]+/g, '_' );
                        var contentCssClass = d.measure + ' ' + className;

                        return '<div class="omh-tooltip ' + contentCssClass + '">' + getTipContent( d ) + '</div>';

                    } );
                }

            };


            var initialize = function () {

                initializeDragInteraction();
                initializeMouseWheelInteraction();
                initializePanZoomInteraction();
                initializeToolbarInteraction();
                initializeTooltipInteraction();

            };

            /**
             * Get the object that handles tooltips shown on hover
             * @returns {{}}
             */
            this.getTooltip = function () {
                return tooltip;
            };

            /**
             * Get the d3 selection that represents the toolbar in the DOM
             * @returns {{}}
             */
            this.getToolbar = function () {
                return toolbar;
            };

            /**
             * Get the Plottable.js pan/zoom object that is attached to the plot
             * @returns {{}}
             */
            this.getPanZoomInteraction = function () {
                return panZoomInteraction;
            };

            /**
             * Get the Plottable.js pan/zoom object that is attached to the x axis
             * @returns {{}}
             */
            this.getpanZoomInteractionXAxis = function () {
                return panZoomInteractionXAxis;
            };

            /**
             * Adds the interactions handled by this ChartInteractions object to the components passed in
             * @param {{}} components - The components to add the interactions to. This should include properties for plots, xScale, and table
             *
             */
            this.addToComponents = function ( components ) {

                // add tooltips to the first scatter plot found
                if ( settings.tooltips.visible ) {
                    for ( var i in components.plots ) {
                        var plot = components.plots[ i ];
                        if ( plot instanceof Plottable.Plots.Scatter && plot.datasets() && plot.datasets().length > 0 ) {
                            attachTooltipsToPlot( plot );
                            break;
                        }
                    }
                }


                //do not let user scale graph too far, and start chart in range
                if ( maxZoomDays ) {
                    limitScaleExtents( components.xScale );
                }

                if ( settings.panZoomUsingMouse.enabled ) {

                    // add pan/zoom interactions
                    attachPanZoomInteractionToComponents( components );

                    if ( settings.panZoomUsingMouse.hint.visible ) {
                        // add pan/zoom hint label to the plot group
                        components.plotGroup.append( panZoomHint );
                    }

                    dragInteraction.attachTo( components.table );

                }

                table = components.table;// reference kept so interaction can be destroyed later
                xScale = components.xScale; // reference kept so zoom toolbar can modify timeline

            };

            /**
             * Adds the interactions handled by this ChartInteractions object to the d3 selection passed in
             * @param {{}} d3Selection - the d3 selection that will receive the interactions
             */
            this.addToSelection = function ( d3Selection ) {

                // save the selection so that it can be used when finding bounds
                selection = d3Selection;

                //remove mouse wheel dispatcher callback from the previous selection if there is one
                mouseWheelDispatcher && mouseWheelDispatcher.offWheel( mouseWheelCallback );

                //and add it to this one
                mouseWheelDispatcher = new Plottable.Dispatchers.Mouse.getDispatcher( selection[ 0 ][ 0 ] )
                    .onWheel( mouseWheelCallback );

                // add tooltip
                tooltip && selection.call( tooltip );

            };

            /**
             * Adds tooltips to the d3 svg entities passed in
             * @param {Array} entities - an array of d3 entities from the rendered plot
             */
            this.addTooltipsToEntities = function ( entities ) {

                //collect the points on the chart that will have tooltips
                //or share an index so that they can be used for group hovers
                tooltipHoverPointEntities = {};
                entityHoverGroups = {};
                entities.forEach( function ( entity ) {

                    var groupName = entity.datum.omhDatum.groupName;

                    if ( !tooltipHoverPointEntities[ groupName ] ) {
                        tooltipHoverPointEntities[ groupName ] = [];
                    }
                    if ( entity.datum.primary ) {
                        tooltipHoverPointEntities[ groupName ][ entity.index ] = entity;
                    }

                    if ( !entityHoverGroups[ groupName ] ) {
                        entityHoverGroups[ groupName ] = [];
                    }
                    if ( !entityHoverGroups[ groupName ][ entity.index ] ) {
                        entityHoverGroups[ groupName ][ entity.index ] = [];
                    }
                    entityHoverGroups[ groupName ][ entity.index ].push( entity );

                } );

            };

            /**
             * Destroys the resources that support the interactions handled by this ChartInteractions object
             */
            this.destroy = function () {

                pointer && pointer.offPointerMove( pointerMove );
                pointer && pointer.detachFrom( pointerPlot );
                dragInteraction && dragInteraction.detachFrom( table );
                tooltip && tooltip.destroy();
                mouseWheelDispatcher && mouseWheelDispatcher.offWheel( mouseWheelCallback );
                showHoverPointTooltip && dragInteraction.offDrag( showHoverPointTooltip );
                toolbar && toolbar.remove();

            };

            // Initialize the ChartInteractions object
            initialize.call( this );

        };

        parent.ChartInteractions = ChartInteractions;

        return parent;

    }
) );

( function ( root, factory ) {

    var parentName = 'OMHWebVisualizations';
    root[ parentName ] = factory( root, parentName );

}( this, function ( root, parentName ) {

    var parent = root.hasOwnProperty( parentName ) ? root[ parentName ] : {};

    var ChartStyles;

    /**
     * Constructs a new ChartStyles object
     * @classdesc This class generates and manages chart visual styles. Style information is specified as an array of objects, each with a 'name', array of 'filters' and list of 'attributes' (see [ChartStyles.setStylesForPlot]{@link ChartStyles#setStylesForPlot}).
     *
     * Filters are functions that take a datum as a parameter and return a boolean. ChartStyles has an array of useful filters, called 'filters', which can be used in a style object.
     *
     * Style information is mapped to a Plottable.Plots.XYPlot using the [ChartStyles.setStylesForPlot]{@link ChartStyles#setStylesForPlot} function [ChartStyles.setStylesForPlot]{@link ChartStyles#setStylesForPlot} and returned by [ChartStyles.getStylesForPlot]{@link ChartStyles#getStylesForPlot}
     *
     * @param {ChartConfiguration} configuration - The ChartConfiguration object that is being used to configure the Chart
     * @constructor
     * @global
     */
    ChartStyles = function ( configuration ) {

        var plotStyles = [];

        var getPointThresholds = function ( d ) {
            return configuration.getMeasureSettings( d.measure ).thresholds;
        };

        /**
         * Get the style specified in the configuration passed in at construction
         * Filters that match the measures containing each style are added to the returned styles
         * @param {Plottable.Plots.XYPlot} plot - The plot that the styles are for
         * @returns {Array} - The styles in the configuration that apply to the type of plot passed in
         */
        this.getConfiguredStylesForPlot = function( plot ){

            var measures = configuration.getConfiguredMeasureNames();
            var styles = [];

            measures.forEach( function( measure ){

                var measureSettings = configuration.getMeasureSettings( measure );

                if ( measureSettings.chart && measureSettings.chart.styles ){
                    var measureStyles = measureSettings.chart.styles;
                    measureStyles.forEach( function( style ){

                        var plotClass = eval( 'Plottable.Plots.' + style.plotType );

                        if( plot instanceof plotClass ){

                            // add a filter to the returned style that matches the measure
                            var measureFilter = function( d ){ return d.measure === measure; };
                            var newStyle = { name:style.name, filters:[ measureFilter ], attributes:style.attributes };

                            // add the filters that are specified in the config. order may not be preserved, but that is ok
                            // because all filters must match for the style to be used on a datum
                            if ( style.filters ){
                                style.filters.forEach( function( filter ){
                                    newStyle.filters.push( filter );
                                });
                            }

                            styles.push( newStyle );

                        }
                    });
                }

            });

            return styles;

        };

        /**
         * Get the combined default and configured styles for a given plot. Configured styles take priority over defaults
         * @param {Plottable.Plots.XYPlot} plot - The plot for which styles will be returned
         * @returns {Array} - The combined styles
         */
        this.getConfiguredDefaultStylesForPlot = function( plot ){
            var defaultStyles = ChartStyles.getDefaultStylesForPlot( plot );
            var configuredStyles = this.getConfiguredStylesForPlot( plot );
            return defaultStyles.concat( configuredStyles );
        };

        /**
         * Check if the datum meets the conditions of all filters in the array
         * @param {Array} filters - The array of filters to check against.
         * @param {{}} d - The datum to check against the filters
         * @returns {boolean} - Returns true only if the datum matches all filters in the array
         */
        this.applyFilters = function ( filters, d ) {

            for ( j = 0; j < filters.length; j++ ) {
                if ( !filters[ j ]( d ) ) {
                    return false;
                }
            }

            return true;

        };

        /**
         * Returns an attribute accessor function based on the attribute styles passed in.
         * If none of the filters in the styles match, the default accessor is used.
         * @param {Array} attributeStyles - An array of styles with filters to check data against
         * @param {function(d:Object)} defaultAccessor - The Accessor to use if a datum is not matched by the filters on which the styles are conditioned
         * @returns {function(d:Object)} - The function that will be used to access an attribute value contained in the styles parameter
         */
        this.getAttributeValueAccessor = function ( attributeStyles, defaultAccessor ) {

            return function ( d ) {
                var attr = this.resolveAttributeValue( attributeStyles, d );
                if ( attr ) {
                    return attr;
                } else {
                    // if no attribute was resolved from the custom styles, use the existing default
                    return defaultAccessor( d );
                }
            }.bind( this );

        };

        /**
         * Re-index the style info by the attribute to assess attribute priority more easily
         * @param {Array} styles - The styles to re-organize
         * @returns {{}} - The styles re-organized as an object with keys for each attribute represented in the styles parameter
         */
        this.getStylesKeyedByAttributeName = function ( styles ) {

            var keyedByAttributeName = {};

            styles.forEach( function ( style ) {

                var attributeNamesInThisStyle = Object.getOwnPropertyNames( style.attributes );
                attributeNamesInThisStyle.forEach( function ( attributeName ) {

                    // init the objects that index the styles
                    if ( !keyedByAttributeName[ attributeName ] ) {
                        keyedByAttributeName[ attributeName ] = [];
                    }
                    var filtersAndValue = {};
                    filtersAndValue.value = style.attributes[ attributeName ];
                    if ( style.filters ) {
                        filtersAndValue.filters = style.filters;
                    }

                    keyedByAttributeName[ attributeName ].push( filtersAndValue );

                } );

            } );

            return keyedByAttributeName;

        };

        /**
         * Get the value of the property by checking the point against the filters
         * Returns null if there is no match.
         * @param {{}} d - The datum to check against the filters
         * @param {String} propertyName - The name of the property to look for
         * @param {Array} propertiesWithFilters - An array of objects, each containing a 'filters' key and a key with the name specified by the propertyName parameter
         * @returns {*} - The value found at the propertyName if the datum matches the filters associated with that property name, or null
         */
        this.getFilteredProperty = function ( d, propertyName, propertiesWithFilters ) {

            // iterate in reverse order so the last styles added are the first returned
            for ( i = propertiesWithFilters.length - 1; i >= 0; i-- ) {

                var filters = propertiesWithFilters[ i ].filters;
                var value = propertiesWithFilters[ i ][ propertyName ];

                if ( filters ) {
                    if ( this.applyFilters( filters, d ) ) {
                        return value;
                    }
                } else {
                    return value;
                }

            }

            return null; //return null if no filters include this point

        };

        /**
         * Resolves the attribute based on filters
         * @param {Array} attributeStyles - An array of style information. Each entry looks something like { filters:[], value:{any} }
         * @param {{}} d - The datum to check against the filters associated with each value
         * @returns {*}
         */
        this.resolveAttributeValue = function ( attributeStyles, d ) {

            return this.getFilteredProperty( d, 'value', attributeStyles );

        };

        /**
         * Returns the styles that have been set for the particular plot instance passed in
         * If the returned styles are subsequently edited, they must be passed to setStylesForPlot() to affect the chart
         * @param {Plottable.Plots.XYPlot} plot - Get the styles associated with this plot instance
         * @returns {Array} - The styles for the plot specified in the plot parameter
         */
        this.getStylesForPlot = function ( plot ) {

            for ( var i in plotStyles ) {
                if ( plotStyles[ i ].plot === plot ) {
                    return plotStyles[ i ].styles;
                }
            }

        };

        /**
         * Set the styles that should be used for the plot instance
         * @param {Array} styles - The styles to use for the plot
         * @param {Plottable.Plots.XYPlot} plot - The plot that should get the styles
         * @example
         * // an array of style information that can be passed in as the style parameter
         * [
         *  {
         *      name: 'red-area',
         *      filters: [ chartStyles.filters.above(120) ],
         *      attributes: {
         *          fill: 'red',
         *          stroke: 'red'
         *      }
         *  },
         * {
         *      name: 'orange-area',
         *      filters: [ chartStyles.filters.above(100), chartStyles.filters.below(120) ],
         *      attributes: {
         *          fill: 'orange',
         *          stroke: 'orange'
         *      }
         *  }
         *  ]
         */
        this.setStylesForPlot = function ( styles, plot ) {

            var currentPlotStyles = this.getStylesForPlot( plot );

            if ( currentPlotStyles ) {
                currentPlotStyles.styles = styles;
            } else {
                plotStyles.push( { 'plot': plot, 'styles': styles } );
            }

            this.assignAttributesToPlot( styles, plot );

        };

        /**
         * Get the name of the style that a datum is rendered with, based on its filters
         * @param d - The datum
         * @param plot - The plot with the styles used for rendering
         * @returns {*}
         */
        this.resolveStyleNameForDatumInPlot = function ( d, plot ) {

            var styles = this.getStylesForPlot( plot );

            if ( styles ) {
                return this.getFilteredProperty( d, 'name', styles );
            } else {
                return null;
            }

        };


        /**
         * Associate the styles with the data points that match their filters using the plot's Plottable.js accessors
         * @param {Array} styles - The styles to associate to the plot
         * @param {Plottable.Plots.XYPlot} plot - The plot
         */
        this.assignAttributesToPlot = function ( styles, plot ) {

            var stylesKeyedByAttributeName = this.getStylesKeyedByAttributeName( styles );

            for ( var attributeName in stylesKeyedByAttributeName ) {

                // set the accessors for the attributes (size uses a different accessor)
                if ( attributeName === 'size' ) {
                    defaultAccessor = plot.size() ? plot.size().accessor : null;
                    plot.size( this.getAttributeValueAccessor( stylesKeyedByAttributeName[ attributeName ], defaultAccessor ) );
                } else {
                    defaultAccessor = plot.attr( attributeName ) ? plot.attr( attributeName ).accessor : null;
                    plot.attr( attributeName, this.getAttributeValueAccessor( stylesKeyedByAttributeName[ attributeName ], defaultAccessor ) );
                }

            }

        };

        /**
         * Add styling information to the D3 selection passed in
         * This includes that gradient used behind the unit label in the y axis
         * @param {d3.Selection} selection - The d3 selection that the styles should be added to.
         */
        this.addToSelection = function ( selection ) {

            // add the gradient that is used in y axis label

            //check if the definition secion is already there
            var defs = selection.select( 'defs' )[ 0 ][ 0 ];

            // if not, add one
            if ( !defs ) {
                defs = selection.append( "defs" );
            } else {
                defs = d3.select( defs );
            }

            //check if there is already a gradient for the y axis label there
            var gradient = defs.select( '#y-axis-label-gradient' )[ 0 ][ 0 ];

            //if not, then add the gradient
            if ( !gradient ) {
                gradient = defs.append( "linearGradient" )
                    .attr( "id", "y-axis-label-gradient" )
                    .attr( "x1", "0%" )
                    .attr( "y1", "0%" )
                    .attr( "x2", "0%" )
                    .attr( "y2", "100%" )
                    .attr( "spreadMethod", "pad" );
                gradient.append( "stop" )
                    .attr( "offset", "0%" )
                    .attr( "stop-color", "#fff" )
                    .attr( "stop-opacity", 1 );
                gradient.append( "stop" )
                    .attr( "offset", "75%" )
                    .attr( "stop-color", "#fff" )
                    .attr( "stop-opacity", 1 );
                gradient.append( "stop" )
                    .attr( "offset", "100%" )
                    .attr( "stop-color", "#fff" )
                    .attr( "stop-opacity", 0 );
            }

        };
    };

    /**
     * A collection of formatters used to format data before it is displayed
     * @memberof ChartStyles
     * @type {{}}
     */
    var formatters = {};

    ChartStyles.formatters = formatters;

    /**
     * Returns the formatted data point value for use in a tooltip.
     * Note: this function must be bound to a ChartConfiguration object to properly handle the number of decimal places
     * @param {{}} d
     * @returns {*}
     * @memberof ChartStyles.formatters
     */
    ChartStyles.formatters.defaultTooltip = function ( d ) {
        var content;
        if ( d.omhDatum.groupName === '_systolic_blood_pressure_diastolic_blood_pressure' ) {
            var systolic = d.omhDatum.body.systolic_blood_pressure.value.toFixed( 0 );
            var diastolic = d.omhDatum.body.diastolic_blood_pressure.value.toFixed( 0 );
            content = systolic + '/' + diastolic;
        } else {
            var settings = this.getInterfaceSettings().tooltips;
            var decimalPlaces = typeof( settings.decimalPlaces ) !== 'undefined' ? settings.decimalPlaces : 1;
            content = d.y.toFixed( decimalPlaces );
        }
        return content;
    };

    /**
     * Get a fresh copy of default styles for the plot.
     * Styles will be returned if the plot is of type Plottable.Plots.Scatter, Plottable.Plots.Line, or Plottable.Plots.ClusteredBar
     * @param {Plottable.Plots.XYPlot} plot - The plot that the styles will be used for. Different styles are returned depending on the type of the plot.
     * @returns {{}}
     * @memberof ChartStyles
     */
    ChartStyles.getDefaultStylesForPlot = function ( plot ) {

        // define these defaults every time this function is called,
        // so that the defaults are preserved even if the return value
        // is altered outside of this function

        var defaults = {

            'Scatter': [
                {
                    'name': 'default',
                    'attributes': {
                        'fill': '#4a90e2',
                        'stroke': '#0066d6',
                        'stroke-width': '1px',
                        'size': 9,
                        'opacity': 0.5
                    }
                }
            ],

            'Line': [
                {
                    'name': 'default',
                    'attributes': {
                        'stroke': '#dedede',
                        'stroke-width': '1px'
                    }
                }
            ],

            'ClusteredBar': [
                {
                    'name': 'default',
                    'attributes': {
                        'fill': '#4a90e2'
                    }
                },
                {
                    'name': 'secondary',
                    'filters': [
                        function ( d ) {
                            return !d.primary;
                        }
                    ],
                    'attributes': {
                        'fill': '#eeeeee'
                    }
                }
            ]

        };

        var defaultStyleForPlot = null;

        for( var plotType in defaults ) {
            var plotClass = eval( 'Plottable.Plots.' + plotType );
            if ( plot instanceof plotClass ){
                defaultStyleForPlot = defaults[ plotType ];
            }
        }

        if ( !defaultStyleForPlot ) {
            return {};
        }

        return defaultStyleForPlot;
    };

    /**
     * An array of functions that return useful filter functions, to help with conditional styling
     * @alias filters
     * @memberof! ChartStyles
     * @type {{}}
     */
    ChartStyles.filters = {
        /**
         * Get a filter that matches the measure
         * @param {String} measure - The measure to match
         * @returns {Function} - The filter function that can be added to a filter array in a style
         * @alias filters.measure
         * @memberof! ChartStyles
         */
        'measure': function ( measure ) {
            return function ( d ) {
                return d.measure === measure;
            };
        },
        /**
         * Get a filter that matches points with y values above max
         * @returns {Function} - The filter function that can be added to a filter array in a style
         * @alias filters.above
         * @memberof! ChartStyles
         * @param {Number} max - The value, above which the matched points' y values must fall
         */
        'above': function ( max ) {
            return function ( d ) {
                return d.y > max;
            };
        },
        /**
         * Get a filter that matches points with y values below min
         * @returns {Function} - The filter function that can be added to a filter array in a style
         * @alias filters.below
         * @memberof! ChartStyles
         * @param {Number} min - The value, below which the matched points' y values must fall
         */
        'below': function ( min ) {
            return function ( d ) {
                return d.y < min;
            };
        },
        /**
         * Get a filter that matches the points with an x value that falls prior to the given hour of each day
         * @returns {Function} - The filter function that can be added to a filter array in a style
         * @alias filters.dailyBeforeHour
         * @memberof! ChartStyles
         * @param {Number} hour - The hour, below which the matched points' x.getHours() must fall
         */
        'dailyBeforeHour': function ( hour ) {
            return function ( d ) {
                return d.x.getHours() < hour;
            };
        }
    };

    parent.ChartStyles = ChartStyles;

    return parent;

} ) );


( function ( root, factory ) {

    var parentName = 'OMHWebVisualizations';
    root[ parentName ] = factory( root, parentName );

}( this, function ( root, parentName ) {

        var parent = root.hasOwnProperty( parentName ) ? root[ parentName ] : {};
        var DataParser;

        /**
         * Creates an object that parses omh data into a format usable Plottable.js
         * @param {{}} data - The data to parse now
         * @param {{}} measures - Strings representing the measures to extract from the data
         * @param {ChartConfiguration} configuration - A configuration object containing settings for parsing data
         * @constructor
         * @global
         * @classdesc This class parses Open mHealth data into a format that is usable by d3 and Plottable.js.
         *
         * When possible, data is structured to make interactions and rendering easier.
         *
         * The following [ChartConfiguration]{@link ChartConfiguration} settings for each measure are used to parse the data:
         *
         * data.yValuePath - a dot-delimited string that indicates where in a data point the y value of a point can be found
         *
         * data.xValueQuantization.period - the granularity of time quantization desired for the data (e.g. [DataParser.QUANTIZE_DAY]{@link DataParser.QUANTIZE_DAY} )
         *
         * data.xValueQuantization.aggregator - how to aggregate data points that are quantized to the same moment in time (e.g. [DataParser.aggregators.mean]{@link DataParser.aggregators.mean} )
         */
        DataParser = function ( data, measures, configuration ) {

            var measureData = null;
            var keyPathArrays = {};

            //days, weeks, months, and years could all be different durations depending on
            //the timeframe, because of month duration differences, daylight savings, leapyear, etc
            //so only use constants for the rest of the time units
            var durations = {
                "ps": 0.000000001,
                "ns": 0.000001,
                "us": 0.001,
                "ms": 1,
                "sec": 1000,
                "min": 60 * 1000,
                "h": 60 * 60 * 1000,
                "d": 'd',
                "wk": 'w',
                "Mo": 'M',
                "yr": 'y'
            };

            var initialize = function () {

                //deep copy data passed in so that it is not altered when we add group names
                var dataCopy = JSON.parse( JSON.stringify( data ) );
                var dateProvider = (typeof moment !== 'undefined')? moment: Date;

                measureData = this.parseOmhData( dataCopy, measures, dateProvider );

                if ( Object.keys( measureData ).length === 0 ) {
                    console.log( "Warning: no data of the specified type could be found." );
                    return false;
                }

            };

            /**
             * Get the value found at a key path
             * @param {object} obj - The object to search for the key path
             * @param {string} keyPath - The path where the desired value should be found
             * @returns {*}
             */
            this.resolveKeyPath = function ( obj, keyPath ) {
                if ( obj === undefined ) {
                    return obj;
                }
                var r;
                if ( typeof keyPath === 'string' ) {
                    if ( !keyPathArrays[ keyPath ] ) {
                        keyPathArrays[ keyPath ] = keyPath.split( '.' );
                    }
                    r = keyPathArrays[ keyPath ].slice();
                } else {
                    r = keyPath;
                }
                try {
                    if ( keyPath && r.length > 0 ) {
                        return this.resolveKeyPath( obj[ r.shift() ], r );
                    }
                } catch ( e ) {
                    console.info( 'Exception while resolving keypath', e );
                }
                return obj;
            };

            /**
             * Get the display date for a datum that has specified an interval rather than a point in time
             * @param {object} omhDatum - The omh formatted datum
             * @param {object} dateProvider - An object that provides dates. Moment.js is used by default.
             * @returns {Date}
             */
            this.getIntervalDisplayDate = function ( omhDatum, dateProvider ) {

                var interval = omhDatum.body[ 'effective_time_frame' ][ 'time_interval' ];
                var startTime = interval[ 'start_date_time' ] ? ( new Date( interval[ 'start_date_time' ] ) ).getTime() : null;
                var endTime = interval[ 'end_date_time' ] ? ( new Date( interval[ 'end_date_time' ] ) ).getTime() : null;
                var startTimeObject = interval[ 'start_date_time' ] ? ( dateProvider( interval[ 'start_date_time' ] ) ) : null;
                var endTimeObject = interval[ 'end_date_time' ] ? ( dateProvider( interval[ 'end_date_time' ] ) ) : null;

                //figure out the duration in milliseconds of the timeframe
                //the timeframe could be a start and end, or it could be just one and a duration
                var duration = interval[ 'duration' ] ? interval[ 'duration' ][ 'value' ] : null;
                //if there is a duration, use it to determine the missing start or end time
                if ( duration ) {
                    var unit = interval[ 'duration' ][ 'unit' ];
                    var durationMs;
                    var durationUnitLength = durations[ unit ];
                    if ( typeof durationUnitLength !== 'string' ) {
                        durationMs = duration * durationUnitLength;
                        if ( !startTime ) {
                            startTime = endTime - durationMs;
                        }
                        if ( !endTime ) {
                            endTime = startTime + durationMs;
                        }
                    } else {
                        if ( !startTime ) {
                            startTime = endTimeObject.subtract( duration, durations[ unit ] ).valueOf();
                        }
                        if ( !endTime ) {
                            endTime = startTimeObject.add( duration, durations[ unit ] ).valueOf();
                        }
                    }
                }

                return this.getSingleDateForDateRange( startTime, endTime );

            };

            /**
             * Get a single Date object to represent the range. Currently just returns the startTime parameter as a Date object.
             * @param startTime
             * @param endTime
             * @returns {Date}
             */
            this.getSingleDateForDateRange = function( startTime, endTime ){
                return new Date( startTime );
            };

            /**
             * Quantize a date to a quantization level
             * @param {Date} date - The date to quantize
             * @param {number} QuantizationLevel - constant defined statically to represent the quantization level, e.g. OMHWebVisualizations.DataParser.QUANTIZE
             * @returns {Date} - The quantized date
             */
            this.quantizeDate = function ( date, quantizationLevel ) {

                //quantize the points
                var month = quantizationLevel <= OMHWebVisualizations.DataParser.QUANTIZE_MONTH ? date.getMonth() : 6;
                var day = quantizationLevel <= OMHWebVisualizations.DataParser.QUANTIZE_DAY ? date.getDate() : quantizationLevel === OMHWebVisualizations.DataParser.QUANTIZE_MONTH ? 15 : 1;
                var hour = quantizationLevel <= OMHWebVisualizations.DataParser.QUANTIZE_HOUR ? date.getHours() : quantizationLevel === OMHWebVisualizations.DataParser.QUANTIZE_DAY ? 12 : 0;
                var minute = quantizationLevel <= OMHWebVisualizations.DataParser.QUANTIZE_MINUTE ? date.getMinutes() : quantizationLevel === OMHWebVisualizations.DataParser.QUANTIZE_HOUR ? 30 : 0;
                var second = quantizationLevel <= OMHWebVisualizations.DataParser.QUANTIZE_SECOND ? date.getSeconds() : quantizationLevel === OMHWebVisualizations.DataParser.QUANTIZE_MINUTE ? 30 : 0;
                var millisecond = quantizationLevel <= OMHWebVisualizations.DataParser.QUANTIZE_MILLISECOND ? date.getMilliseconds() : quantizationLevel === OMHWebVisualizations.DataParser.QUANTIZE_SECOND ? 500 : 0;

                return new Date( date.getFullYear(), month, day, hour, minute, second, millisecond );

            };


            /**
             * Parse out the data into an array that can be used by Plottable.js
             * @param omhData - The data to parse, formatted according to Open mHealth schemas
             * @param measuresToParse - The measures to pull out of the data
             * @param dateProvider - An object that provides dates. Moment.js is used by default.
             * @returns {array} - An array of data ready for use in a Plottable.js plot
             */
            this.parseOmhData = function ( omhData, measuresToParse, dateProvider ) {

                var _self = this;

                var parsedData = {};
                var quantizationLevels = {};
                var keyPaths = {};

                //if there is no data, return an empty object
                if ( !( omhData ) || omhData.length === 0 ) {
                    return parsedData;
                }

                measuresToParse.forEach( function ( measure, i ) {
                    quantizationLevels[ measure ] = configuration.getMeasureSettings( measure ).data.xValueQuantization.period;
                    keyPaths[ measure ] = configuration.getMeasureSettings( measure ).data.yValuePath;
                } );

                omhData.forEach( function ( omhDatum ) {

                    //if there is more than one measure type in a body, set up refs
                    //so that the interface can treat the data points as a group

                    //generate a group name for each data point that encodes
                    //which measures are in its group. because the concatenation
                    //order is defined by the measure list string, even if the
                    //measures in data bodies are unordered, the same name
                    //will be produced

                    omhDatum.groupName = "";

                    measuresToParse.forEach( function ( measure, i ) {

                        var yValue = _self.resolveKeyPath( omhDatum, keyPaths[ measure ] );

                        if ( yValue !== undefined && typeof yValue !== 'object' ) {

                            omhDatum.groupName += '_' + measure;

                            if ( !parsedData.hasOwnProperty( measure ) ) {
                                parsedData[ measure ] = [];
                            }

                            //prepare the time (x value) at which the point will be plotted
                            var date;
                            if ( omhDatum.body[ 'effective_time_frame' ][ 'date_time' ] ) {
                                date = _self.quantizeDate( new Date( omhDatum.body[ 'effective_time_frame' ][ 'date_time' ] ), quantizationLevels[ measure ] );
                            }

                            if ( omhDatum.body[ 'effective_time_frame' ][ 'time_interval' ] ) {
                                date = _self.quantizeDate( _self.getIntervalDisplayDate( omhDatum, dateProvider ), quantizationLevels[ measure ] );
                            }

                            //create the datum that plottable will use
                            parsedData[ measure ].push( {
                                'y': yValue,
                                'x': date,
                                'provider': omhDatum.header.acquisition_provenance.source_name,
                                'omhDatum': omhDatum,
                                'primary': i === 0, // the tooltip is associated with the first measure in the group
                                'measure': measure
                            } );

                        }


                    } );

                } );

                //quantized data should be aggregated
                measuresToParse.forEach( function ( measure, i ) {
                    if ( quantizationLevels[ measure ] !== OMHWebVisualizations.DataParser.QUANTIZE_NONE ) {
                        _self.aggregateData( measure, parsedData );
                    }
                } );

                return parsedData;

            };


            /**
             * Aggregate Plottable.js data points at the same time coordinates
             * @param {string} measure - The measure will be used to look up the aggregation settings in the ChartConfiguration
             * @param {Array} data - The Plottable.js data the should be aggregated
             */
            this.aggregateData = function ( measure, data ) {
                var aggregator = configuration.getMeasureSettings( measure ).data.xValueQuantization.aggregator;
                aggregator( data[ measure ] );
            };

            /**
             * Get the data for the measure
             * @param {string} measure
             * @returns {Array}
             */
            this.getMeasureData = function ( measure ) {
                return measureData[ measure ];
            };

            /**
             * Get all data found, organized by measure
             * @returns {Array}
             */
            this.getAllMeasureData = function () {
                return measureData;
            };

            /**
             * See if there is data for the measure
             * @param measure
             * @returns {boolean}
             */
            this.hasMeasureData = function ( measure ) {
                return measureData.hasOwnProperty( measure );
            };

            return initialize.call( this );

        };

        /**
         * Constant used for configuring quantization
         * @memberof DataParser
         * @type {number}
         */
        DataParser.QUANTIZE_YEAR = 6;
        /**
         * Constant used for configuring quantization
         * @memberof DataParser
         * @type {number}
         */
        DataParser.QUANTIZE_MONTH = 5;
        /**
         * Constant used for configuring quantization
         * @memberof DataParser
         * @type {number}
         */
        DataParser.QUANTIZE_DAY = 4;
        /**
         * Constant used for configuring quantization
         * @memberof DataParser
         * @type {number}
         */
        DataParser.QUANTIZE_HOUR = 3;
        /**
         * Constant used for configuring quantization
         * @memberof DataParser
         * @type {number}
         */
        DataParser.QUANTIZE_MINUTE = 2;
        /**
         * Constant used for configuring quantization
         * @memberof DataParser
         * @type {number}
         */
        DataParser.QUANTIZE_SECOND = 1;
        /**
         * Constant used for configuring quantization
         * @memberof DataParser
         * @type {number}
         */
        DataParser.QUANTIZE_MILLISECOND = 0;
        /**
         * Constant used for configuring quantization
         * @memberof DataParser
         * @type {number}
         */
        DataParser.QUANTIZE_NONE = -1;

        /**
         * DataParser.aggregators
         * A static collection of methods for aggregating data points
         * That sit at the same point in time after quantization
         * @type {{}}
         */
        DataParser.aggregators = {};

        /**
         * Aggregate points with the same time value by summing them.
         *
         * Provenance data for the first point (chronologically) will be preserved. For a given moment in time shared by more than one point, all but one point at that time are removed from the data array, and references to aggregated points are stored in the remaining point as 'aggregatedData' field.
         * @param {Array} data - The data to aggregate
         * @alias aggregators.sum
         * @memberof! DataParser
         */
        DataParser.aggregators.sum = function ( data ) {
            data.sort( function ( a, b ) {
                return a.x.getTime() - b.x.getTime();
            } );
            for ( var i = 0; i < data.length; i++ ) {
                while ( i + 1 < data.length && ( data[ i + 1 ].x.getTime() === data[ i ].x.getTime() ) ) {
                    data[ i ].y += data[ i + 1 ].y;
                    if ( !data[ i ].aggregatedData ) {
                        data[ i ].aggregatedData = [ data[ i ].omhDatum ];
                    }
                    data[ i ].aggregatedData.push( data[ i + 1 ].omhDatum );
                    data.splice( i + 1, 1 );
                }
                data[ i ].aggregationType = 'sum';
            }
        };

        /**
         * Aggregate points with the same time value by finding the mean.
         *
         * Provenance data for the first point( chronologically ) will be preserved. For a given moment in time shared by more than one point, all but one point at that time are removed from the data array, and references to aggregated points are stored in the remaining point as 'aggregatedData' field.
         * @param {Array} data - The data to aggregate
         * @alias aggregators.mean
         * @memberof! DataParser
         */
        DataParser.aggregators.mean = function ( data ) {
            parent.DataParser.aggregators.sum( data );
            for ( var i = 0; i < data.length; i++ ) {
                var count = data[ i ].aggregatedData ? data[ i ].aggregatedData.length : 0;
                if ( count > 0 ) {
                    data[ i ].y /= count;
                    data[ i ].aggregationType = 'mean';
                }
            }
        };
        /**
         * Aggregate points with the same time value by finding the mean.
         *
         * Provenance data for the first point( chronologically ) will be preserved. For a given moment in time shared by more than one point, all but one point at that time are removed from the data array, and references to aggregated points are stored in the remaining point as 'aggregatedData' field.
         * @param {Array} data - The data to aggregate
         * @alias aggregators.mean
         * @memberof! DataParser
         */
        DataParser.aggregators.median = function ( data ) {
            data.sort( function ( a, b ) {
                return a.x.getTime() - b.x.getTime();
            } );
            for ( var i = 0; i < data.length; i++ ) {
                var values = [ data[ i ].y ];
                while ( i + 1 < data.length && ( data[ i + 1 ].x.getTime() === data[ i ].x.getTime() ) ) {
                    if ( !data[ i ].aggregatedData ) {
                        data[ i ].aggregatedData = [ data[ i ].omhDatum ];
                    }
                    values.push( data[ i + 1 ].y );
                    data[ i ].aggregatedData.push( data[ i + 1 ].omhDatum );
                    data.splice( i + 1, 1 );
                }
                data[ i ].aggregationType = 'median';
                data[ i ].y = values[ parseInt( data[ i ].aggregatedData.length / 2 ) ];
            }
        };

        parent.DataParser = DataParser;

        return parent;

    }
) );

( function ( root, factory ) {

    var parentName = 'OMHWebVisualizations';
    root[ parentName ] = factory( root, parentName );

}( this, function ( root, parentName ) {

    var parent = root.hasOwnProperty( parentName ) ? root[ parentName ] : {};

    var Utils;

    /**
     * No need to construct utils, because it is static. Placeholder for future use.
     * @constructor
     * @global
     * @classdesc
     * This glass is a home for very general static functions that support the library
     */
    Utils = function () {
    };

    /**
     * Deep, recursive merge of the properties of two objects.
     * @param {{}} obj1 - The base object
     * @param {{}} obj2 - The object with priority in the case of shared properties
     * @returns {{}}
     * @memberof Utils
     */
    Utils.mergeObjects = function ( obj1, obj2 ) {

        var merged = {};

        function set_attr( attr ) {
            if ( merged[ attr ] === undefined ) {
                var val1 = obj1[ attr ];
                var val2 = obj2[ attr ];
                // If both are objects, merge them. If not, or if the second value is an array, do not merge them
                if ( typeof(val1) === typeof(val2) && typeof(val1) === "object" && !( val2 instanceof Array ) ) {
                    merged[ attr ] = parent.Utils.mergeObjects( val1 || {}, val2 || {} );
                }
                else {
                    merged[ attr ] = val1;
                    if ( obj2.hasOwnProperty( attr ) ) {
                        merged[ attr ] = val2;
                    }
                }
            }
        }

        for ( var attrname in obj1 ) {
            set_attr( attrname );
        }

        for ( attrname in obj2 ) {
            set_attr( attrname );
        }

        return merged;

    };

    parent.Utils = Utils;

    return parent;

} ) );



