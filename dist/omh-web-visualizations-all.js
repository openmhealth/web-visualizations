( function ( root, factory ) {

    var parentName = 'OMHWebVisualizations';
    root[ parentName ] = factory( root, parentName );

}( this, function ( root, parentName ) {

    var parent = root.hasOwnProperty( parentName ) ? root[ parentName ] : {};

    parent.ChartConfiguration = function ( measures, settings ) {

        var mergedSettings;
        var measureNames;

        var defaultTooltipContentFormatter = function ( d ) {
            var content;
            if ( d.omhDatum.groupName === '_systolic_blood_pressure_diastolic_blood_pressure' ) {
                var systolic = d.omhDatum.body.systolic_blood_pressure.value.toFixed( 0 );
                var diastolic = d.omhDatum.body.diastolic_blood_pressure.value.toFixed( 0 );
                content = systolic + '/' + diastolic;
            } else {
                var decimalPlaces = typeof( settings.decimalPlaces ) !== 'undefined' ? settings.decimalPlaces : 1;
                content = d.y.toFixed( decimalPlaces );
            }
            return content;
        };

        var defaultSettings = {
            'userInterface': {
                'toolbar': { 'enabled': true },
                'timespanButtons': { 'enabled': true },
                'zoomButtons': { 'enabled': true },
                'navigation': { 'enabled': true },
                'thresholds': { 'show': true },
                'tooltips': {
                    'enabled': true,
                    'timeFormat': 'M/D/YY, h:mma',
                    'decimalPlaces': 0,
                    'contentFormatter': defaultTooltipContentFormatter,
                    'grouped': true,
                },
                'panZoom': {
                    'enabled': true,
                    'showHint': true
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
                    'valueKeyPath': 'body.body_weight.value',
                    'range': { 'min': 0, 'max': 100 },
                    'units': 'kg',
                    'thresholds': { 'max': 57 },
                },
                'heart_rate': {
                    'valueKeyPath': 'body.heart_rate.value',
                    'range': { 'min': 30, 'max': 150 },
                    'units': 'bpm',
                },
                'step_count': {
                    'valueKeyPath': 'body.step_count',
                    'range': { 'min': 0, 'max': 1500 },
                    'units': 'Steps',
                    'seriesName': 'Steps',
                    'timeQuantizationLevel': parent.DataParser.QUANTIZE_DAY,
                    'quantizedDataConsolidationFunction': parent.DataParser.consolidators.summation,
                    'chart': {
                        'type': 'clustered_bar',
                        'barColor': '#eeeeee',
                        'daysShownOnTimeline': { 'min': 7, 'max': 90 },
                    },
                },
                'minutes_moderate_activity': {
                    'valueKeyPath': 'body.minutes_moderate_activity.value',
                    'range': { 'min': 0, 'max': 300 },
                    'units': 'Minutes',
                    'seriesName': 'Minutes of moderate activity',
                    'timeQuantizationLevel': parent.DataParser.QUANTIZE_DAY,
                    'quantizedDataConsolidationFunction': parent.DataParser.consolidators.summation,
                    'chart': {
                        'type': 'clustered_bar',
                        'daysShownOnTimeline': { 'min': 7, 'max': 90 },
                    },
                },
                'systolic_blood_pressure': {
                    'valueKeyPath': 'body.systolic_blood_pressure.value',
                    'range': { 'min': 30, 'max': 200 },
                    'units': 'mmHg',
                    'thresholds': { 'max': 120 },
                },
                'diastolic_blood_pressure': {
                    'valueKeyPath': 'body.diastolic_blood_pressure.value',
                    'range': { 'min': 30, 'max': 200 },
                    'units': 'mmHg',
                    'thresholds': { 'max': 80 },
                }
            }
        };

        var genericMeasureDefaults = {
            'range': { 'min': 0, 'max': 100 },
            'units': 'Units',
            'seriesName': 'Series',
            'timeQuantizationLevel': parent.DataParser.QUANTIZE_NONE,
            'quantizedDataConsolidationFunction': parent.DataParser.consolidators.average,
            'chart': {
                'type': 'line',
                'pointSize': 9,
                'lineColor': '#dedede',
                'pointFillColor': '#4a90e2',
                'pointStrokeColor': '#0066d6',
                'aboveThresholdPointFillColor': '#e8ac4e',
                'aboveThresholdPointStrokeColor': '#745628',
                'barColor': '#4a90e2',
                'daysShownOnTimeline': { 'min': 1, 'max': 1000 },
            },
        };

        /**
         *
         * Initialization
         *
         * */

        var initialize = function () {

            mergedSettings = parent.Utils.mergeObjects( defaultSettings, settings );
            measureNames = d3.keys( mergedSettings.measures );

            measureNames.forEach( function ( measure ) {
                mergedSettings.measures[ measure ] = parent.Utils.mergeObjects( genericMeasureDefaults, mergedSettings.measures[ measure ] );
            } );

        };

        this.getMeasureSettings = function ( measure ) {
            return mergedSettings.measures[ measure ];
        };

        this.getPrimaryMeasureSettings = function () {
            return mergedSettings.measures[ measures[ 0 ] ];
        };

        this.getInterfaceSettings = function () {
            return mergedSettings.userInterface;
        };

        /**
         *
         * Initialize the object
         *
         * */

        initialize.call( this );

    };

    return parent;

} ) );


( function ( root, factory ) {

    var parentName = 'OMHWebVisualizations';
    root[ parentName ] = factory( root, parentName );

}( this, function ( root, parentName ) {

        var parent = root.hasOwnProperty( parentName ) ? root[ parentName ] : {};

        parent.ChartInteractions = function ( element, configuration, parser, styles ) {

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

                if ( settings.panZoom.enabled ) {

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
                var limits = configuration.getPrimaryMeasureSettings().chart.daysShownOnTimeline;
                minZoomDays = limits ? limits.min : false;
                maxZoomDays = limits ? limits.max : false;

            };

            var initializeToolbarInteraction = function () {

                if ( settings.toolbar.enabled ) {
                    toolbar = element.append( "div" )
                        .classed( 'omh-chart-toolbar', true )
                        .attr( 'unselectable', 'on' );

                    if ( settings.timespanButtons.enabled ) {

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

                    if ( settings.zoomButtons.enabled ) {

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

                    if ( settings.navigation.enabled ) {
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

                if ( settings.tooltips.enabled ) {

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
             *
             * Public member functions
             *
             * */

            this.getTooltip = function () {
                return tooltip;
            };
            this.getToolbar = function () {
                return toolbar;
            };
            this.getPanZoomInteraction = function () {
                return panZoomInteraction;
            };
            this.getpanZoomInteractionXAxis = function () {
                return panZoomInteractionXAxis;
            };

            this.addToComponents = function ( components ) {

                // add tooltips to the first scatter plot found
                for ( var i in components.plots ) {
                    var plot = components.plots[ i ];
                    if ( plot instanceof Plottable.Plots.Scatter && plot.datasets() && plot.datasets().length > 0 ) {
                        attachTooltipsToPlot( plot );
                        break;
                    }
                }

                // add pan/zoom interactions
                attachPanZoomInteractionToComponents( components );

                //do not let user scale graph too far, and start chart in range
                if ( maxZoomDays ) {
                    limitScaleExtents( components.xScale );
                }

                // add pan/zoom hint label to the plots
                if ( settings.enabled && settings.showHint ) {
                    components.plots.push( panZoomHint );
                }

                dragInteraction.attachTo( components.table );


                table = components.table;// reference kept so interaction can be destroyed later
                xScale = components.xScale; // reference kept so zoom toolbar can modify timeline

            };

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

            this.destroy = function () {

                pointer && pointer.offPointerMove( pointerMove );
                pointer && pointer.detachFrom( pointerPlot );
                dragInteraction && dragInteraction.detachFrom( table );
                tooltip && tooltip.destroy();
                mouseWheelDispatcher && mouseWheelDispatcher.offWheel( mouseWheelCallback );
                showHoverPointTooltip && dragInteraction.offDrag( showHoverPointTooltip );
                toolbar && toolbar.remove();

            };

            /**
             *
             * Initialize the object
             *
             * */

            initialize.call( this );

        };

        return parent;

    }
) )
;
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


( function ( root, factory ) {

    var parentName = 'OMHWebVisualizations';
    root[ parentName ] = factory( root, parentName );

}( this, function ( root, parentName ) {

        var parent = root.hasOwnProperty( parentName ) ? root[ parentName ] : {};

        parent.DataParser = function ( data, measures, configuration ) {

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

            /**
             *
             * Initialization
             *
             * */

            var initialize = function () {

                //deep copy data passed in so that it is not altered when we add group names
                var dataCopy = JSON.parse( JSON.stringify( data ) );

                measureData = this.parseOmhData( dataCopy, measures, moment );

                if ( Object.keys( measureData ).length === 0 ) {
                    console.log( "Warning: no data of the specified type could be found." );
                    return false;
                }

            };

            /*
             *
             * Member functions
             *
             * */

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

            this.getIntervalDisplayDate = function ( omhDatum, dateProvider, quantizationLevel ) {

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

                return new Date( startTime );

            };

            this.quantizeDate = function( date, quantizationLevel ){

                //quantize the points
                var month = quantizationLevel <= OMHWebVisualizations.DataParser.QUANTIZE_MONTH ? date.getMonth() : 6;
                var day = quantizationLevel <= OMHWebVisualizations.DataParser.QUANTIZE_DAY ? date.getDate() : quantizationLevel === OMHWebVisualizations.DataParser.QUANTIZE_MONTH ? 15 : 1;
                var hour = quantizationLevel <= OMHWebVisualizations.DataParser.QUANTIZE_HOUR ? date.getHours() : quantizationLevel === OMHWebVisualizations.DataParser.QUANTIZE_DAY ? 12 : 0;
                var minute = quantizationLevel <= OMHWebVisualizations.DataParser.QUANTIZE_MINUTE ? date.getMinutes() : quantizationLevel === OMHWebVisualizations.DataParser.QUANTIZE_HOUR ? 30 : 0;
                var second = quantizationLevel <= OMHWebVisualizations.DataParser.QUANTIZE_SECOND ? date.getSeconds() : quantizationLevel === OMHWebVisualizations.DataParser.QUANTIZE_MINUTE ? 30 : 0;
                var millisecond = quantizationLevel <= OMHWebVisualizations.DataParser.QUANTIZE_MILLISECOND ? date.getMilliseconds() : quantizationLevel === OMHWebVisualizations.DataParser.QUANTIZE_SECOND ? 500 : 0;

                return new Date( date.getFullYear(), month, day, hour, minute, second, millisecond );

            };



            //parse out the data into an array that can be used by plottable
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
                    quantizationLevels[ measure ] = configuration.getMeasureSettings( measure ).timeQuantizationLevel;
                    keyPaths[ measure ] = configuration.getMeasureSettings( measure ).valueKeyPath;
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

                //quantized data should be consolidated
                measuresToParse.forEach( function ( measure, i ) {
                    if ( quantizationLevels[ measure ] !== OMHWebVisualizations.DataParser.QUANTIZE_NONE ) {
                        _self.consolidateData( measure, parsedData );
                    }
                } );

                return parsedData;

            };


            // consolidate data points at the same time coordinates
            this.consolidateData = function ( measure, data ) {
                var consolidator = configuration.getMeasureSettings( measure ).quantizedDataConsolidationFunction;
                consolidator( data[ measure ] );
            };

            //return the data for the measure
            this.getMeasureData = function ( measure ) {
                return measureData[ measure ];
            };

            //return the data organized by measure
            this.getAllMeasureData = function () {
                return measureData;
            };

            //see if there is data for the measure
            this.hasMeasureData = function ( measure ) {
                return measureData.hasOwnProperty( measure );
            };


            /**
             *
             * Initialize the object
             *
             * */
            return initialize.call( this );

        };

        // Add constants for quantization
        parent.DataParser.QUANTIZE_YEAR = 6;
        parent.DataParser.QUANTIZE_MONTH = 5;
        parent.DataParser.QUANTIZE_DAY = 4;
        parent.DataParser.QUANTIZE_HOUR = 3;
        parent.DataParser.QUANTIZE_MINUTE = 2;
        parent.DataParser.QUANTIZE_SECOND = 1;
        parent.DataParser.QUANTIZE_MILLISECOND = 0;
        parent.DataParser.QUANTIZE_NONE = -1;

        // static collection of methods for consolidating data points
        // that sit at the same point in time after quantization
        parent.DataParser.consolidators = {};

        // consolidate by summation
        // provenance data for the first (chronologically) will be preserved
        parent.DataParser.consolidators.summation = function ( data ) {
            data.sort( function ( a, b ) {
                return a.x.getTime() - b.x.getTime();
            } );
            for ( var i = 0; i < data.length; i++ ) {
                while ( i + 1 < data.length && ( data[ i + 1 ].x.getTime() === data[ i ].x.getTime() ) ) {
                    data[ i ].y += data[ i + 1 ].y;
                    if ( !data[ i ].consolidatedData ) {
                        data[ i ].consolidatedData = [ data[ i ].omhDatum ];
                    }
                    data[ i ].consolidatedData.push( data[ i + 1 ].omhDatum );
                    data[ i ].consolidationType = 'summation';
                    data.splice( i + 1, 1 );
                }
            }
        };

        // consolidate by average
        // provenance data for the first (chronologically) will be preserved
        parent.DataParser.consolidators.average = function ( data ) {
            parent.DataParser.consolidators.summation( data );
            for ( var i = 0; i < data.length; i++ ) {
                var count = data[ i ].consolidatedData ? data[ i ].consolidatedData.length : 0;
                if ( count > 0 ) {
                    data[ i ].y /= count;
                    data[ i ].consolidationType = 'average';
                }
            }
        };

        return parent;

    }
) );