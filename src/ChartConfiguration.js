( function ( root, factory ) {

    var parentName = 'OMHWebVisualizations';
    root[ parentName ] = factory( root, parentName );

}( this, function ( root, parentName ) {

    var parent = root.hasOwnProperty( parentName ) ? root[ parentName ] : {};

    parent.ChartConfiguration = function ( settings ) {

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
                        'barColor': '#eeeeee',
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
                'pointSize': 9,
                'lineColor': '#dedede',
                'pointFillColor': '#4a90e2',
                'pointStrokeColor': '#0066d6',
                'aboveThresholdPointFillColor': '#e8ac4e',
                'aboveThresholdPointStrokeColor': '#745628',
                'barColor': '#4a90e2',
                'daysShownOnTimeline': { 'min': 1, 'max': 1000 }
            }
        };

        /**
         *
         * Initialization
         *
         * */
        var initialize = function () {

            mergedSettings = parent.Utils.mergeObjects( defaultSettings, settings );
            measureNames = Object.keys( mergedSettings.measures );

            measureNames.forEach( function ( measure ) {
                mergedSettings.measures[ measure ] = parent.Utils.mergeObjects( genericMeasureDefaults, mergedSettings.measures[ measure ] );
            } );

        };

        this.getMeasureSettings = function ( measure ) {
            return mergedSettings.measures[ measure ];
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

