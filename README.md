
# Open mHealth Web Visualizations

This library renders visualizations of Open mHealth structured data in a web browser. 
It currently generates line charts and bar charts, with default settings included for the following measures:

* body weight (`body_weight`)
* heart rate (`heart_rate`)
* blood pressure (`systolic_blood_pressure`,`diastolic_blood_pressure`)
* physical activity (`step_count`, `minutes_moderate_activity`)

The charting functions of the library are built on top of [Plottable.js](http://plottablejs.org/), which is built on top of [D3](http://d3js.org/). You can play with a live demo [here](http://www.openmhealth.org/visualizationFiddle).

You can learn more about the [design principles behind these visualisations](http://www.openmhealth.org/documentation/#/visualize-data/visualization-library) on our website, and learn about [how design became implementation](http://www.openmhealth.org/see-it-believe-it-the-web-visualization-library/) on our blog.

### Installation
If you'd like to use the charts in your own project, simply pull the library into your project as a [Bower](http://bower.io/) dependency using

* `bower install omh-web-visualizations`

> If you don't have Bower, install it using `npm install -g bower`. If you don't have [npm](https://www.npmjs.com/), you'll need to install [Node.js](https://docs.npmjs.com/getting-started/installing-node).

If you'd like to experiment with the library using a demonstration page,

1. Clone this repository
    * `git clone https://github.com/openmhealth/web-visualizations.git`
1. Navigate to the cloned repository and install the project's dependencies with Bower
    * `bower install`
1. Install the development dependencies using npm
    * `npm install`
1. Make your changes
1. To publish your changes to the `dist` directory, run [gulp](http://gulpjs.com/)
    * `gulp`
1. To see the results on the example page
    * `gulp watch` and open [http://localhost:8080/examples/charts.html](http://localhost:8080/examples/charts.html) in your browser
1. If you leave it running, gulp will watch for changes in the background and update `dist` as needed

### Building a chart

You can create a chart by calling:

```javascript
chart = new OMHWebVisualizations.Chart( data, element, measureList, settings );
```

The arguments passed to the constructor are:

Argument | Description
---: | ---
*data* | An array of Open mHealth structured data points.
*element* | A dom element, such as a `<div>` containing an `<svg>` node. This can also be a D3 selection. For backward compatibility, it can also be a jQuery object, however this functionality is deprecated and may be removed in a future release.
*measureList* | A string containing a comma-separated list of Open mHealth measures to display.
*settings* | An object with [settings](#configuring_a_chart) for the chart. If this is omitted or if an empty object is passed in, the function uses the default settings explained below.

The easiest way to create data points to pass to the `data` parameter is to use our [sample data generator](https://github.com/openmhealth/sample-data-generator). You can either use a pre-generated [data set](https://github.com/openmhealth/sample-data-generator/releases/download/v1.0.0/one-year-of-data.json.gz), or download the generator itself to create data that fits your needs.

A chart is considered *initialized* if the constructor `OMHWebVisualizations.Chart(...);` completes. If, for example, no measures specified in the `measureList` argument can be found in the `data` argument, the constructor will not complete, and the chart will not be initialized. Initialization state is tracked by the `Chart.initialized` property, which can be used as a condition for rendering a chart or requesting its components after construction.

### Configuring a chart

The `settings` parameter of the `OMHWebVisualization.Chart(...)` function is divided into two sections. The `interface` section controls the UI of the chart as a whole. The `measures` section contains settings that customize charts for specific measures. 

The following object is the default settings object used by the `OMHWebVisualization.Chart(...)` function when its `settings` parameter is empty. You can specify any subset of these settings to override them:

```javascript

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
            'contentFormatter': OMHWebVisualizations.ChartStyles.formatters.defaultTooltip.bind( this ),
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
                    'period': OMHWebVisualizations.DataParser.QUANTIZE_DAY,
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
                    'period': OMHWebVisualizations.DataParser.QUANTIZE_DAY,
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


```

For example, using these default settings to graph `heart_rate` data will generate a chart that looks like this:

![Configured Chart](http://www.openmhealth.org/media/viz_example_default_options.png "Default Chart")

If you look carefully at the default settings object, you'll also notice that some measure settings have more properties than others. When a property is missing, the following default settings are assumed. 

```javascript
{
   'yAxis': {
       'range': { 'min': 0, 'max': 100 },
       'label': 'Units',
   },
   'data':{
        'xValueQuantization': {
           'period': OMHWebVisualizations.DataParser.QUANTIZE_NONE,
           'aggregator': OMHWebVisualizations.DataParser.aggregators.mean,
        }
   },
   'chart': {
       'type': 'line',
       'daysShownOnTimeline': { 'min': 1, 'max': 1000 },
   },
   'legend': {
       'seriesName': 'Series',
       'seriesColor': '#4a90e2'
   }
}
```

Additionally, default styles are provided for rendering each measure's plot.

To override the defaults, specify the new interface settings and styles in the `settings` object passed to `OMHWebVisualization.Chart(...)`.
For example, if you would like to graph `heart_rate` data with a blue line and no tooltips, you'd use the following `settings` object:

```javascript
{
  'interface': {
    'tooltips': {
      'visible': false,
     }
  },
  'measures': {
      'heart_rate': {
          'chart': {
              'styles': [
                  {
                      'name': 'blue-lines',
                      'plotType': 'Line',
                      'attributes': {
                          'stroke': '#4a90e2'
                      }
                  }
              ]
          }
      }
  }
}
```
This will produce a chart that looks something like the following screenshot:

![Configured Chart](http://www.openmhealth.org/media/viz_example_user_options.png "Configured Chart")

### Automatic Y Axis Ranging

The Y axis range can be set to adapt to the data by setting the `yAxis.range` property of a measure's settings to `undefined` e.g. `settings.measures.heart_rate.yAxis.range = undefined`_

### Quantization

Quantization reduces the dataset's size by summarizing each group of points that fall into a common time range, or "bucket," with a single point that represents their bucket's range.

Currently, quantized data point values within each subsequent quantization bucket are *averaged* (mean) for most measures and *summed* for `step_count` and `minutes_moderate_activity`.

If you wish to configure the `timeQuantizationLevel` for a measure, you will need the following constants:

* `OMHWebVisualizations.DataParser.QUANTIZE_YEAR`
* `OMHWebVisualizations.DataParser.QUANTIZE_MONTH`
* `OMHWebVisualizations.DataParser.QUANTIZE_DAY`
* `OMHWebVisualizations.DataParser.QUANTIZE_HOUR`
* `OMHWebVisualizations.DataParser.QUANTIZE_MINUTE`
* `OMHWebVisualizations.DataParser.QUANTIZE_SECOND`
* `OMHWebVisualizations.DataParser.QUANTIZE_MILLISECOND`
* `OMHWebVisualizations.DataParser.QUANTIZE_NONE`

These can be used in an `settings` object as follows:

```javascript
// an example of some settings for a distance chart
var settings = {
    'measures': {
        'distance': {
            'seriesName': 'Distance',
            'yAxis':{
                'range': { 'min': 0, 'max': 200000 },
                'label': 'm'
            },
            'data': {
                'yValuePath': 'body.distance.value',
                'xValueQuantization': {
                    'period': OMHWebVisualizations.DataParser.QUANTIZE_MONTH,
                    'aggregator': OMHWebVisualizations.DataParser.aggregators.sum
                }
            },
            'chart': {
                'type': 'clustered_bar',
                'daysShownOnTimeline': { 'min': 90, 'max': 365 }
            }
        }
    }
};
```

Here is a chart of some *unquantized* data:
![Unquantized Data](http://www.openmhealth.org/media/viz_example_unquantized_data.png "Unquantized Data")

As an example, the data will be quantized by hour using `OMHWebVisualizations.DataParser.QUANTIZE_HOUR`. Thus all points in the hour from 04:00 to 05:00 will be *summed* into a single point. The *unquantized* points in this hour are shown below in a zoomed-in view of the minutes just before 05:00:
![Unquantized Data Detail](http://www.openmhealth.org/media/viz_example_unquantized_data_detail1.png "Unquantized Data Detail")

And here is a chart of the same data *quantized* by hour. The points before 05:00 in the zoomed-in view above have been accumulated into a single point, shown in dark blue:
![Quantized Data](http://www.openmhealth.org/media/viz_example_quantized_data.png "Quantized Data")

### Gridlines

Horizontal lines (e.g. representing safe thresholds) can be drawn on charts. Each line is labelled with a custom label or its `y` value, unless that label will overlap another gridline's label. Here are two maximum gridlines with default appearance:
![Default Gridlines](http://www.openmhealth.org/media/viz_example_threshold_basic.png "Default Maximum Gridline")

Gridlines can be specified as `gridlines` in the `chart` property of a measure in the `measures` section of the configuration `settings` object, eg: `settings.measures.heart_rate.chart.gridlines`. It should be an array of gridline objects, as detailed below:

Property | Description
---: | ---
*value* | The y value of the horizontal line.
*label* | The label to show above the line (optional). If no label is specified, the `value` property is used.
*visible* | Whether to show the gridline (optional).

On a chart of type `line`, a labeled horizontal rule is drawn all the way across the chart for each gridline. Gridlines are not drawn on bar charts.

To create a new gridline without using the `settings` object, you can alternatively call `chart.addGridline()` before the chart is rendered.

### Extending default appearances with ChartStyles

To change the colors and other visual attributes of points on the chart, you can specify a `chart.styles` section in each measure in the `measures` block of the configuration `settings` object.
You can alternatively customize the chart's `ChartStyles` object before rendering the chart by calling `chart.getStylesForPlot()` and `chart.setStylesForPlot()`. The Plottable plot you wish to affect must be passed into these functions.

Below is an example of what can be done. See `examples/charts.html` for code samples.

```javascript
var dangerValue = 120;

// these filter functions are used to determine which
// points will be rendered with the style's attributes
var dangerFilter = function ( d ) {

    // a filter function takes a datum and returns a boolean
    return d.y >= dangerValue;
    
};

var dangerSettings = {
    'measures': {
        'systolic_blood_pressure':{
            'chart':{
                'styles': {
                    'name': 'danger',
                    'plotType': 'Scatter',
                    'filters': [ dangerFilter ],
                    'attributes': {
                        'fill': 'red'
                        'stroke': 'red'
                    }
                }
            }
        }
    }
}

//builds a new plottable chart with the danger settings
chart = new OMHWebVisualizations.Chart( data, element, measureList, dangerSettings );
if ( chart.initialized ) {
    chart.renderTo( element.select( "svg" ).node() );
}

```

The code above changes the color of points above the gridline:
![Above Gridline Color](http://www.openmhealth.org/media/viz_example_threshold_color.png "Above Gridline Color")

You could also add a range in the chart that is colored differently:
![Above Gridline Color with Colored Range](http://www.openmhealth.org/media/viz_example_threshold_color_band.png "Above Gridline Color with Colored Range")

### Tooltips

Tooltips can be enabled, disabled, and configured using the `userInterface.tooltips` property of the `settings` object passed into the constructor ([see 'Configuring a Chart'](#configuring_a_chart)). The properties of `userInterface.tooltips` are explained in the following table:

Property | Description
---: | ---
*enabled* | Whether to show tooltips when the user hovers on a point.
*timeFormat* | A string representing the [time format](http://momentjs.com/docs/#/displaying/format/) for the time field in the tooltip.
*decimalPlaces* | The number of decimal places to show the datum's `y` value with by default when rendering a data point value in the tooltip.
*contentFormatter* | A function that takes a D3 datum and returns a string. Used to render the datum in the tooltip. If undefined, the datum's `y` value will be truncated by a default formatter to the number of decimal places specified in the `decimalPlaces` parameter and converted to a string.
*grouped* | Whether to show a single common tooltip for data points of different measure types that are found together in the body of a single data point.


In the following chart, we see a tooltip that has been colored light orange to match its point in the diastolic blood pressure series:

![Above Gridline Tooltip](http://www.openmhealth.org/media/viz_example_threshold_above_tip_2.png "Above Gridline Tooltip")

And here is the CSS used for the tooltip:
```css
.omh-tooltip.above .value {
  color: #e8ac4e;
}
```


You can restrict the tooltip colors to only `diastolic_blood_pressure` as follows:
```css
.omh-tooltip.diastolic_blood_pressure.b .value {
  color: #e8ac4e;
}
```


In the same chart, we see a tooltip that has been colored red to match its point below the gridline in the systolic blood pressure series:

![Above Gridline Tooltip with Custom Color](http://www.openmhealth.org/media/viz_example_threshold_above_tip_1.png "Above Gridline Tooltip with Custom Color")

Here is the CSS used for the systolic tooltip:
```css
.omh-tooltip.systolic_blood_pressure.below .value {
  color:#ce5050;
}
```


And again, in the same chart, we see a tooltip that has been colored light orange to match its point in the first measure:
![Within Gridline Tooltip with Custom Color](http://www.openmhealth.org/media/viz_example_threshold_warning_tip.png "Within Gridline Tooltip with Custom Color")

The point shown above has matched a chart style named `warning`:
In order for this to work, the corresponding chart style's `name` property is set to `warning` as follows:
```javascript
{
   'name': 'warning',
   'filters': chartStyles.filters.above( 120 ),
   'attributes':{ 'fill': '#e8ac4e', 'stroke': '#745628' }
}
```
(where chartStyles is an instance of OMHWebVisualizations.ChartStyles)

And here is the CSS used to style tooltip
```css
.omh-tooltip.warning .value {
   color:#e8ac4e;
}
```
See `examples/charts.html` for js and css code samples.


### Rendering a chart

Once a chart has been constructed, it must be rendered to an `<svg>` element. Render the chart by calling:

```javascript
chart.renderTo( svgElement );
```

### Further customizations

After a chart has been constructed, but *before it is rendered*, you may choose to get the Plottable components and make further modifications that are not afforded by the constructor's `settings` parameter. Get the Plottable components, modify them, and render the chart as follows:

```javascript

// construct chart here...

if (chart.initialized) {
   
   var components = chart.getComponents();

   // modify plottable components here...

   chart.renderTo( svgElement );

}

```

To see an example of component modification, check out the `examples/charts.html` file in this repository.

### Destroying a chart

In order to free up resources or re-use an element for a new chart, the chart and all of its interactive features can be destroyed with:

```javascript
chart.destroy();
```

### Contributing

To contribute to this repository

1. Open an [issue](https://github.com/openmhealth/web-visualizations/issues) to let us know what you're going to work on.
  1. This lets us give you feedback early and lets us put you in touch with people who can help.
2. Fork this repository.
3. Create your feature branch from the `develop` branch.
4. Commit and push your changes to your fork.
5. Create a pull request.
