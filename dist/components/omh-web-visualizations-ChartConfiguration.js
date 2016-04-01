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
     {
         'interface': {
             'toolbar': {
                 'visible': true,
                 'timespanButtons': { 'visible': true },
                 'zoomButtons': { 'visible': true },
                 'navigationButtons': { 'visible': true }
             },
             'tooltips': {
                 'visible': true,
                 'timeFormat': 'M/D/YY, h:mma',
                 'decimalPlaces': 0,
                 'contentFormatter': ChartStyles.formatters.defaultTooltip.bind( this ),
                 'grouped': true
             },
             'panZoomUsingMouse': {
                 'enabled': true,
                 'hint':{
                     'visible': true
                 }
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
                 'data': {
                     'yValuePath': 'body.body_weight.value',
                 },
                 'yAxis': {
                     'range': { 'min': 0, 'max': 100 },
                     'label': 'kg'
                 }
             },
             'heart_rate': {
                 'data':{
                     'yValuePath': 'body.heart_rate.value'
                 },
                 'yAxis': {
                     'range': { 'min': 30, 'max': 150 },
                     'label': 'bpm'
                 }
             },
             'step_count': {
                 'data': {
                     'yValuePath': 'body.step_count',
                     'xValueQuantization': {
                         'period': DataParser.QUANTIZE_DAY,
                         'aggregator': parent.DataParser.aggregators.sum
                     }
                 },
                 'chart': {
                     'type': 'clustered_bar',
                     'daysShownOnTimeline': { 'min': 7, 'max': 90 }
                 },
                 'legend': {
                     'seriesName': 'Steps',
                     'seriesColor': '#eeeeee'
                 },
                 'yAxis': {
                     'range': { 'min': 0, 'max': 1500 },
                     'label': 'Steps'
                 }
             },
             'minutes_moderate_activity': {
                 'data':{
                     'yValuePath': 'body.minutes_moderate_activity.value',
                     'xValueQuantization': {
                         'period': DataParser.QUANTIZE_DAY,
                         'aggregator': DataParser.aggregators.sum
                     }
                 },
                 'chart': {
                     'type': 'clustered_bar',
                     'daysShownOnTimeline': { 'min': 7, 'max': 90 }
                 },
                 'legend': {
                     'seriesName': 'Minutes of moderate activity',
                     'seriesColor': '#4a90e2'
                 },
                 'yAxis':{
                     'range': { 'min': 0, 'max': 300 },
                     'label': 'Minutes'
                 }
             },
             'systolic_blood_pressure': {
                 'data': {
                     'yValuePath': 'body.systolic_blood_pressure.value'
                 },
                 'yAxis': {
                     'range': { 'min': 30, 'max': 200 },
                     'label': 'mmHg'
                 }
             },
             'diastolic_blood_pressure': {
                 'data': {
                     'yValuePath': 'body.diastolic_blood_pressure.value'
                 },
                 'yAxis':{
                     'range': { 'min': 30, 'max': 200 },
                     'label': 'mmHg'
                 }
             }
         }
     }
     */
    ChartConfiguration = function ( settings ) {

        var mergedSettings;
        var measureNames;

        var defaultSettings = {
            'interface': {
                'toolbar': {
                    'visible': true,
                    'timespanButtons': { 'visible': true },
                    'zoomButtons': { 'visible': true },
                    'navigationButtons': { 'visible': true }
                },
                'tooltips': {
                    'visible': true,
                    'timeFormat': 'M/D/YY, h:mma',
                    'decimalPlaces': 0,
                    'contentFormatter': parent.ChartStyles.formatters.defaultTooltip.bind( this ),
                    'grouped': true
                },
                'panZoomUsingMouse': {
                    'enabled': true,
                    'hint': {
                        'visible': true
                    }
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
                    'data': {
                        'yValuePath': 'body.body_weight.value',
                    },
                    'yAxis': {
                        'range': { 'min': 0, 'max': 100 },
                        'label': 'kg'
                    }
                },
                'heart_rate': {
                    'data': {
                        'yValuePath': 'body.heart_rate.value'
                    },
                    'yAxis': {
                        'range': { 'min': 30, 'max': 150 },
                        'label': 'bpm'
                    }
                },
                'step_count': {
                    'data': {
                        'yValuePath': 'body.step_count',
                        'xValueQuantization': {
                            'period': parent.DataParser.QUANTIZE_DAY,
                            'aggregator': parent.DataParser.aggregators.sum
                        }
                    },
                    'chart': {
                        'type': 'clustered_bar',
                        'daysShownOnTimeline': { 'min': 7, 'max': 90 }
                    },
                    'legend': {
                        'seriesName': 'Steps',
                        'seriesColor': '#eeeeee'
                    },
                    'yAxis': {
                        'range': { 'min': 0, 'max': 1500 },
                        'label': 'Steps'
                    }
                },
                'minutes_moderate_activity': {
                    'data': {
                        'yValuePath': 'body.minutes_moderate_activity.value',
                        'xValueQuantization': {
                            'period': parent.DataParser.QUANTIZE_DAY,
                            'aggregator': parent.DataParser.aggregators.sum
                        }
                    },
                    'chart': {
                        'type': 'clustered_bar',
                        'daysShownOnTimeline': { 'min': 7, 'max': 90 }
                    },
                    'legend': {
                        'seriesName': 'Minutes of moderate activity',
                        'seriesColor': '#4a90e2'
                    },
                    'yAxis': {
                        'range': { 'min': 0, 'max': 300 },
                        'label': 'Minutes'
                    }
                },
                'systolic_blood_pressure': {
                    'data': {
                        'yValuePath': 'body.systolic_blood_pressure.value'
                    },
                    'yAxis': {
                        'range': { 'min': 30, 'max': 200 },
                        'label': 'mmHg'
                    }
                },
                'diastolic_blood_pressure': {
                    'data': {
                        'yValuePath': 'body.diastolic_blood_pressure.value'
                    },
                    'yAxis': {
                        'range': { 'min': 30, 'max': 200 },
                        'label': 'mmHg'
                    }
                }
            }
        };

        var genericMeasureDefaults = {
            'yAxis': {
                'range': { 'min': 0, 'max': 100 },
                'label': 'Units'
            },
            'data': {
                'xValueQuantization': {
                    'period': parent.DataParser.QUANTIZE_NONE,
                    'aggregator': parent.DataParser.aggregators.mean
                }
            },
            'chart': {
                'type': 'line',
                'daysShownOnTimeline': { 'min': 1, 'max': 1000 }
            },
            'legend': {
                'seriesName': 'Series',
                'seriesColor': '#4a90e2'
            }
        };

        var initialize = function () {

            mergedSettings = parent.Utils.mergeObjects( defaultSettings, settings );
            measureNames = Object.keys( mergedSettings.measures );

            measureNames.forEach( function ( measure ) {
                mergedSettings.measures[ measure ] = parent.Utils.mergeObjects( genericMeasureDefaults, mergedSettings.measures[ measure ] );
            } );

        };

        this.getConfiguredMeasureNames = function () {
            return Object.keys( mergedSettings.measures );
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
         * @returns {{}}
         */
        this.getInterfaceSettings = function () {
            return mergedSettings.interface;
        };

        // Initialize the ChartConfiguration
        initialize.call( this );

    };

    parent.ChartConfiguration = ChartConfiguration;

    return parent;

} ) );
