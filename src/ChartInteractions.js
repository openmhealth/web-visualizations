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
