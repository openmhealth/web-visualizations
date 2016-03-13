/*
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

    // Add a Utils namespace for functions that are not directly Chart related
    root[ parentName ].Utils = {};

    // Function merges defaults and options into one config settings object
    root[ parentName ].Utils.mergeObjects = function ( obj1, obj2 ) {
        var merged = {};

        function set_attr( attr ) {
            if ( merged[ attr ] === undefined ) {
                var val1 = obj1[ attr ];
                var val2 = obj2[ attr ];
                // If both are objects, merge them. If not, or if the second value is an array, do not merge them
                if ( typeof(val1) === typeof(val2) && typeof(val1) === "object" && !( val2 instanceof Array ) ) {
                    merged[ attr ] = root[ parentName ].Utils.mergeObjects( val1 || {}, val2 || {} );
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


}( this, function ( root, parentName ) {

    var parent = root.hasOwnProperty( parentName ) ? root[ parentName ] : {};

    parent.Chart = function ( data, element, measureList, options ) {

        var selection;
        var measures = measureList.split( /\s*,\s*/ );
        var table = null;
        var configuration = new OMHWebVisualizations.ChartConfiguration( measures, options );
        var parser = new OMHWebVisualizations.DataParser( data, measures, configuration );
        var styles = new OMHWebVisualizations.ChartStyles( configuration );
        var interactions = new OMHWebVisualizations.ChartInteractions( element, configuration, parser, styles );
        this.initialized = false;

        // if the element passed in is a jQuery element, then get the dom element
        if ( typeof jQuery === 'function' && element instanceof jQuery ) {
            element = element[ 0 ];
        }
        //check if the element passed in is a d3 selection
        if ( !element.node ) {
            element = d3.select( element );
        }
        if ( !options ) {
            options = {};
        }

        element.classed( 'omh-chart-container', true );

        //save a ref to a destroy method
        this.destroy = function () {
            interactions.destroy();
            table && table.destroy();
            yScaleCallback && yScale.offUpdate( yScaleCallback );
        };

        //public method for getting the plottable chart component
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
                    'values': thresholdValues
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

        // return the measures that this chart can show
        this.getMeasures = function(){
            return measures;
        };
        // return the styles used to render the plots
        this.getStyles = function(){
            return styles;
        };
        // return the interactions used to present the plots
        this.getInteractions = function(){
            return interactions;
        };
        // return the configuration used to render the plots
        this.getConfiguration = function(){
            return configuration;
        };
        // return the parser used to process the data
        this.getParser = function(){
            return parser;
        };

        //public method for getting the d3 selection
        this.getD3Selection = function () {
            return selection;
        };


        // set up axes
        var xScale = new Plottable.Scales.Time();
        var yScale = new Plottable.Scales.Linear();
        var yScaleCallback = null;
        var domain = configuration.getPrimaryMeasureSettings().range;
        if ( domain ) {
            yScale.domainMin( domain.min ).domainMax( domain.max );
        }

        var xAxis = new Plottable.Axes.Time( xScale, 'bottom' )
            .margin( 15 )
            .addClass( 'x-axis' );

        var yAxis = new Plottable.Axes.Numeric( yScale, 'left' );

        var yLabel = new Plottable.Components.AxisLabel( configuration.getPrimaryMeasureSettings().units, '0' )
            .padding( 5 )
            .xAlignment( 'right' )
            .yAlignment( 'top' );


        //create a plot with hover states for each data set
        var plots = [];

        //set up points
        var pointPlot = new Plottable.Plots.Scatter()
            .x( function ( d ) {
                return d.x;
            }, xScale )
            .y( function ( d ) {
                return d.y;
            }, yScale );

        styles.setStylesForPlot( styles.getDefaultStylesForPlot( pointPlot ), pointPlot );

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


        // If there are thresholds for any of the measures, add them as gridlines

        var thresholdValues = [];
        var gridlines;
        var gridlineYAxis;

        var addToThresholdValues = function ( thresholds ) {

            if ( thresholds.max ) {
                thresholdValues.push( thresholds.max );
            }
            if ( thresholds.min ) {
                thresholdValues.push( thresholds.min );
            }

        };

        if ( configuration.getInterfaceSettings().thresholds.show !== false ) {

            measures.forEach( function ( measure ) {

                var thresholds = configuration.getMeasureSettings( measure ).thresholds;

                if ( thresholds ) {
                    addToThresholdValues( thresholds );
                }

            } );

            if ( thresholdValues.length > 0 ) {

                thresholdValues.sort( function ( a, b ) {
                    return a - b;
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
                    var ticks = thresholdValues;
                    return ticks;
                };
                gridlineYScale.tickGenerator( yScaleTickGenerator );

                gridlineYAxis = new Plottable.Axes.Numeric( gridlineYScale, "right" )
                    .tickLabelPosition( "top" )
                    .tickLabelPadding( 1 )
                    .showEndTickLabels( true )
                    .addClass( 'gridlines-axis' );

                gridlines = new Plottable.Components.Gridlines( null, gridlineYScale );

                plots.push( gridlines );
                plots.push( gridlineYAxis );

            }

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
                    var domain = measureSettings.range;
                    var units = measureSettings.units;
                    barYScale = new Plottable.Scales.Linear()
                        .domainMin( domain.min ).domainMax( domain.max );
                    var barYAxis = new Plottable.Axes.Numeric( barYScale, 'right' );
                    var barYLabel = new Plottable.Components.AxisLabel( units, '0' )
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

                styles.setStylesForPlot( styles.getDefaultStylesForPlot( clusteredBarPlot ), clusteredBarPlot );

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

                styles.setStylesForPlot( styles.getDefaultStylesForPlot( linePlot ), linePlot );

                //add data
                linePlot.addDataset( dataset );
                pointPlot.addDataset( dataset );

                //prepare for plot group
                linePlot.addClass( 'line-plot-' + measure );
                plots.push( linePlot );

            }

        } );

        // point plot is always added regardless of chart type
        // because Pointer interactions are attached to it
        pointPlot.addClass( 'point-plot' );
        plots.push( pointPlot );

        var colorScale = null;
        var legend = null;
        if ( configuration.getInterfaceSettings().legend ) {
            //add legend
            colorScale = new Plottable.Scales.Color();
            legend = new Plottable.Components.Legend( colorScale );
            var names = [];
            var colors = [];
            d3.entries( parser.getAllMeasureData() ).forEach( function ( entry ) {
                var measure = entry.key;
                var measureSettings = configuration.getMeasureSettings( measure );
                var name = measureSettings.seriesName;
                var type = measureSettings.chart.type;

                // The color to plot depends on the type of chart
                var color;
                switch ( type ) {
                    case 'clustered_bar':
                        color = measureSettings.chart.barColor;
                        break;
                    default:
                        color = measureSettings.chart.pointFillColor;
                        break;
                }

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

        //render chart
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
            interactions.addTooltipsToEntities( pointPlot.entities() );

        };

        this.initialized = true;

    };

    return parent;

} ) )
;

