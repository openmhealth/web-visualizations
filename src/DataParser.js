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
