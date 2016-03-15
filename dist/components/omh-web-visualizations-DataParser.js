( function ( root, factory ) {

    var parentName = 'OMHWebVisualizations';
    root[ parentName ] = factory( root, parentName );

}( this, function ( root, parentName ) {

        var parent = root.hasOwnProperty( parentName ) ? root[ parentName ] : {};

        /**
         * Creates an object that parses omh data into a format usable Plottable.js
         * @param {array} data - The data to parse
         * @param {array} measures - Strings representing the measures to extract from the data
         * @param {OMHWebVisualizations.ChartConfiguration} configuration - a configuration object containing options for parsing data
         * @constructor
         */
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

            /*
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

            /**
             * Get the value found at a key path
             * @param {object} obj - the object to search for the key path
             * @param {string} keyPath - the path where the desired value should be found
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
             * @param {object} omhDatum - the omh formatted datum
             * @param {object} dateProvider - an object that provides dates. Moment.js is used by default.
             * @param {number} quantizationLevel - constant defined statically to represent the quantization level, e.g. OMHWebVisualizations.DataParser.QUANTIZE_DAY
             * @returns {Date}
             */
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

            /**
             * Quantize a date to a quantization level
             * @param {Date} date - the date to quantize
             * @param {number} quantizationLevel - constant defined statically to represent the quantization level, e.g. OMHWebVisualizations.DataParser.QUANTIZE
             * @returns {Date} - the quantized date
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
             * @param omhData - the data to parse, formatted according to Open mHealth schemas
             * @param measuresToParse - the measures to pull out of the data
             * @param dateProvider - an object that provides dates. Moment.js is used by default.
             * @returns {array} - an array of data ready for use in a Plottable.js plot
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


            /**
             * Consolidate Plottable.js data points at the same time coordinates
             * @param {string} measure - the measure will be used to look up the consolidation settings in the ChartConfiguration
             * @param {Array} data - the Plottable.js data the should be consolidated
             */
            this.consolidateData = function ( measure, data ) {
                var consolidator = configuration.getMeasureSettings( measure ).quantizedDataConsolidationFunction;
                consolidator( data[ measure ] );
            };

            /**
             * Get the data for the measure
             * @param {string} measure - return any data found for the measure
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


            /*
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

        /**
         * Consolidate by summation
         * Provenance data for the first point (chronologically) will be preserved
         * @param data
         */
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

        /**
         * Consolidate by averaging
         * Provenance data for the first point (chronologically) will be preserved
         * @param data
         */
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