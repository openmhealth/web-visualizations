( function ( root, factory ) {

    var parentName = 'OMHWebVisualizations';
    root[ parentName ] = factory( root, parentName );

}( this, function ( root, parentName ) {

    var parent = root.hasOwnProperty( parentName ) ? root[ parentName ] : {};

    parent.ChartStyles = function ( configuration ) {

        var plotStyles = [];

        var getPointThresholds = function ( d ) {
            return configuration.getMeasureSettings( d.measure ).thresholds;
        };

        var filters = {
            'measure': function ( measure ) {
                return function ( d ) {
                    return d.measure === measure;
                };
            },
            'above': function ( max ) {
                return function ( d ) {
                    return d.y > max;
                };
            },
            'aboveThresholdMax': function () {
                return function ( d ) {
                    var thresholds = getPointThresholds( d );
                    var max = thresholds ? thresholds.max : null;
                    return max ? d.y > max : false;
                };
            },
            'below': function ( min ) {
                return function ( d ) {
                    return d.y < min;
                };
            },
            'belowThresholdMin': function () {
                return function ( d ) {
                    var thresholds = getPointThresholds( d );
                    var min = thresholds ? thresholds.min : null;
                    return min ? d.y < min : false;
                };
            },
            'dailyBeforeHour': function ( hour ) {
                return function ( d ) {
                    return d.x.getHours() < hour;
                };
            }
        };

        //expose filters as a public member
        this.filters = filters;

        //allow access to default styles
        this.getDefaultStylesForPlot = function ( plot ) {

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
                    },
                    {
                        'name': 'above',
                        'filters': [ filters.aboveThresholdMax() ],
                        'attributes': {
                            'fill': '#e8ac4e',
                            'stroke': '#745628',
                        }
                    },
                    {
                        'name': 'below',
                        'filters': [ filters.belowThresholdMin() ],
                        'attributes': {
                            'fill': '#e8ac4e',
                            'stroke': '#745628',
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
                            'fill': '#4a90e2',
                        }
                    },
                    {
                        'name': 'secondary',
                        'filters': [ function ( d ) {
                            return !d.primary;
                        } ],
                        'attributes': {
                            'fill': '#eeeeee',
                        }
                    }

                ]

            };

            var defaultStyleForPlot = defaults[ plot.constructor.name ];

            if ( !defaultStyleForPlot ) {
                return {};
            }

            return defaultStyleForPlot;
        };

        //check if the point meets the conditions of all filters in the array
        this.applyFilters = function ( filters, d ) {

            for ( j = 0; j < filters.length; j++ ) {
                if ( !filters[ j ]( d ) ) {
                    return false;
                }
            }

            return true;

        };

        //returns an attribute accessor function based on the attribute styles passed in
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

        //re-index the style info by the attribute so we can assess priority more easily
        this.getStylesKeyedByAttributeName = function ( styles ) {

            var keyedByAttributeName = {};

            styles.forEach( function ( style ) {

                var attributeNamesInThisStyle = Object.getOwnPropertyNames( style.attributes );
                attributeNamesInThisStyle.forEach( function ( attributeName ) {

                    // init the objects that index the styles
                    if ( !keyedByAttributeName[ attributeName ] ) {
                        keyedByAttributeName[ attributeName ] = [];
                    }
                    var filtersAndValue = { 'filters': style.filters, 'value': style.attributes[ attributeName ] };
                    keyedByAttributeName[ attributeName ].push( filtersAndValue );

                } );

            } );

            return keyedByAttributeName;

        };

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

        // resolves the attribute based on filters
        this.resolveAttributeValue = function ( attributeStyles, d ) {

            return this.getFilteredProperty( d, 'value', attributeStyles );

        };

        // allow access to styles
        this.getStylesForPlot = function ( plot ) {
            for ( var i in plotStyles ) {
                if ( plotStyles[ i ].plot === plot ) {
                    return plotStyles[ i ].styles;
                }
            }
        };

        // allow access to styles
        this.setStylesForPlot = function ( styles, plot ) {

            var currentPlotStyles = this.getStylesForPlot( plot );

            if ( currentPlotStyles ) {
                currentPlotStyles.styles = styles;
            } else {
                plotStyles.push( { 'plot': plot, 'styles': styles } );
            }

            this.assignAttributesToPlot( styles, plot );

        };

        // get the name of the style that a datum is using, based on its filters
        this.resolveStyleNameForDatumInPlot = function ( d, plot ) {

            var styles = this.getStylesForPlot( plot );

            if ( styles ) {
                return this.getFilteredProperty( d, 'name', styles );
            } else {
                return null;
            }

        };


        // associate the styles with the points using the plottable accessors
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

        this.addToSelection = function ( selection ) {

            // add the gradient that is used in y axis label
            var defs = selection.select( 'defs' )[ 0 ][ 0 ];

            if ( !defs ) {
                defs = selection.append( "defs" );
            } else {
                defs = d3.select( defs );
            }

            var gradient = defs.select( '#y-axis-gradient' )[ 0 ][ 0 ];

            if ( !gradient ) {
                gradient = defs.append( "linearGradient" )
                    .attr( "id", "y-axis-gradient" )
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

    return parent;

} ) );
