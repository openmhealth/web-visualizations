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
     * {
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
                    'contentFormatter': ChartStyles.formatters.defaultTooltip.bind( this ),
                    'grouped': true
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
                    'thresholds': { 'max': 57 }
                },
                'heart_rate': {
                    'valueKeyPath': 'body.heart_rate.value',
                    'range': { 'min': 30, 'max': 150 },
                    'units': 'bpm'
                },
                'step_count': {
                    'valueKeyPath': 'body.step_count',
                    'range': { 'min': 0, 'max': 1500 },
                    'units': 'Steps',
                    'seriesName': 'Steps',
                    'timeQuantizationLevel': DataParser.QUANTIZE_DAY,
                    'quantizedDataConsolidationFunction': DataParser.consolidators.summation,
                    'chart': {
                        'type': 'clustered_bar',
                        'daysShownOnTimeline': { 'min': 7, 'max': 90 }
                    }
                },
                'minutes_moderate_activity': {
                    'valueKeyPath': 'body.minutes_moderate_activity.value',
                    'range': { 'min': 0, 'max': 300 },
                    'units': 'Minutes',
                    'seriesName': 'Minutes of moderate activity',
                    'timeQuantizationLevel': DataParser.QUANTIZE_DAY,
                    'quantizedDataConsolidationFunction': DataParser.consolidators.summation,
                    'chart': {
                        'type': 'clustered_bar',
                        'daysShownOnTimeline': { 'min': 7, 'max': 90 }
                    }
                },
                'systolic_blood_pressure': {
                    'valueKeyPath': 'body.systolic_blood_pressure.value',
                    'range': { 'min': 30, 'max': 200 },
                    'units': 'mmHg',
                    'thresholds': { 'max': 120 }
                },
                'diastolic_blood_pressure': {
                    'valueKeyPath': 'body.diastolic_blood_pressure.value',
                    'range': { 'min': 30, 'max': 200 },
                    'units': 'mmHg',
                    'thresholds': { 'max': 80 }
                }
            }
        }
     */
    ChartConfiguration = function ( settings ) {

        var mergedSettings;
        var measureNames;

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
                    'contentFormatter': parent.ChartStyles.formatters.defaultTooltip.bind( this ),
                    'grouped': true
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
                    'thresholds': { 'max': 57 }
                },
                'heart_rate': {
                    'valueKeyPath': 'body.heart_rate.value',
                    'range': { 'min': 30, 'max': 150 },
                    'units': 'bpm'
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
                        'daysShownOnTimeline': { 'min': 7, 'max': 90 }
                    }
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
                        'daysShownOnTimeline': { 'min': 7, 'max': 90 }
                    }
                },
                'systolic_blood_pressure': {
                    'valueKeyPath': 'body.systolic_blood_pressure.value',
                    'range': { 'min': 30, 'max': 200 },
                    'units': 'mmHg',
                    'thresholds': { 'max': 120 }
                },
                'diastolic_blood_pressure': {
                    'valueKeyPath': 'body.diastolic_blood_pressure.value',
                    'range': { 'min': 30, 'max': 200 },
                    'units': 'mmHg',
                    'thresholds': { 'max': 80 }
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
                'daysShownOnTimeline': { 'min': 1, 'max': 1000 }
            }
        };

        var initialize = function () {

            mergedSettings = parent.Utils.mergeObjects( defaultSettings, settings );
            measureNames = Object.keys( mergedSettings.measures );

            measureNames.forEach( function ( measure ) {
                mergedSettings.measures[ measure ] = parent.Utils.mergeObjects( genericMeasureDefaults, mergedSettings.measures[ measure ] );
            } );

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
         * @returns {defaultSettings.userInterface|{toolbar, timespanButtons, zoomButtons, navigation, thresholds, tooltips, panZoom, axes}|options.userInterface|{axes, thresholds, tooltips}|i.userInterface|n.userInterface|*}
         */
        this.getInterfaceSettings = function () {
            return mergedSettings.userInterface;
        };

        // Initialize the ChartConfiguration
        initialize.call( this );

    };

    parent.ChartConfiguration = ChartConfiguration;

    return parent;

} ) );

