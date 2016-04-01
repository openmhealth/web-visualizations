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

