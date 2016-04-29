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

