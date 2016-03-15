# Open mHealth Web Visualizations

This library renders visualizations of Open mHealth structured data in a web browser. 
It currently generates line charts and bar charts, with default settings included for the following measures:

* body weight (`body_weight`)
* heart rate (`heart_rate`)
* blood pressure (`systolic_blood_pressure`,`diastolic_blood_pressure`)
* physical activity (`step_count`, `minutes_moderate_activity`)

The charting functions of the library are built on top of [Plottable.js](http://plottablejs.org/), which is built on top of [D3](http://d3js.org/). You can play with a live demo [here](http://www.openmhealth.org/visualizationFiddle).

You can learn more about the [design principles behind these visualisations](http://www.openmhealth.org/documentation/#/visualize-data/visualization-library) on our website, and learn about [how design became implementation](http://www.openmhealth.org/see-it-believe-it-the-web-visualization-library/) on our blog.

###Installation
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
1. Open `charts.html` in the `example` directory to see the result
1. To let gulp watch for changes in the background and update `dist` as needed
    * `gulp watch`

###Building a chart

You can create a chart by calling:

```javascript
chart = new OMHWebVisualizations.Chart( data, element, measureList, options );
```

The arguments passed to the constructor are:

Argument | Description
---: | ---
*data* | An array of Open mHealth structured data points.
*element* | A dom element, such as a `<div>` containing an `<svg>` node. This can also be a D3 selection. For backward compatibility, it can also be a jQuery object, however this functionality is deprecated and may be removed in a future release.
*measureList* | A string containing a comma-separated list of Open mHealth measures to display.
*options* | An object with [settings](#configuring_a_chart) for the chart. If this is omitted or if an empty object is passed in, the function uses the default settings explained below.

The easiest way to create data points to pass to the `data` parameter is to use our [sample data generator](https://github.com/openmhealth/sample-data-generator). You can either use a pre-generated [data set](https://github.com/openmhealth/sample-data-generator/releases/download/v1.0.0/one-year-of-data.json.gz), or download the generator itself to create data that fits your needs.

A chart is considered *initialized* if the constructor `OMHWebVisualizations.Chart(...);` completes. If, for example, no measures specified in the `measureList` argument can be found in the `data` argument, the constructor will not complete, and the chart will not be initialized. Initialization state is tracked by the `Chart.initialized` property, which can be used as a condition for rendering a chart or requesting its components after construction.

###Configuring a chart

The `options` parameter of the `OMHWebVisualization.Chart(...)` function is divided into two sections. A `userInterface` section controls the UI of the chart as a whole. The `measures` section contains settings that customize charts for specific measures. 

The following object is the default settings object used by the `OMHWebVisualization.Chart(...)` function when its `options` parameter is empty. You can specify any subset of these settings to override them:

```javascript

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
        'contentFormatter': OMHWebVisualizations.ChartStyles.formatters.defaultTooltip,
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
        'timeQuantizationLevel': OMHWebVisualizations.DataParser.QUANTIZE_DAY,
        'quantizedDataConsolidationFunction': OMHWebVisualizations.DataParser.consolidators.summation,
        'chart': {
            'type': 'clustered_bar',
            'barColor': '#eeeeee',
            'daysShownOnTimeline': { 'min': 7, 'max': 90 }
        },
    },
    'minutes_moderate_activity': {
        'valueKeyPath': 'body.minutes_moderate_activity.value',
        'range': { 'min': 0, 'max': 300 },
        'units': 'Minutes',
        'seriesName': 'Minutes of moderate activity',
        'timeQuantizationLevel': OMHWebVisualizations.DataParser.QUANTIZE_DAY,
        'quantizedDataConsolidationFunction': OMHWebVisualizations.DataParser.consolidators.summation,
        'chart': {
            'type': 'clustered_bar',
            'daysShownOnTimeline': { 'min': 7, 'max': 90 }
        },
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

```

For example, using these default settings to graph `heart_rate` data will generate a chart that looks like this:

![Configured Chart](http://www.openmhealth.org/media/viz_example_default_options.png "Default Chart")

If you look carefully at the default settings object, you'll also notice that some measure settings have more properties than others. When a property is missing, the following default settings are assumed. 

```javascript
{
   'range': { 'min': 0, 'max': 100 },
   'units': 'Units',
   'seriesName': 'Series',
   'timeQuantizationLevel': OMHWebVisualizations.DataParser.QUANTIZE_NONE,
   'quantizedDataConsolidationFunction': OMHWebVisualizations.DataParser.consolidators.average,
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
   }
}
```

To override these defaults, simply specify them in the corresponding `measures` section of the `options` object passed to `OMHWebVisualization.Chart(...)`. If you would like to graph `heart_rate` data with a blue line and no tooltips, for example, you'd use the following settings object:

```javascript
{
  'userInterface': {
    'tooltips': {
      'enabled': false,
     }
  },
  'measures': {
    'heart_rate': {
      'chart': {
        'lineColor' : '#4a90e2'
      }
    }
  }
}
```
This will produce a chart that looks something like the following screenshot:

![Configured Chart](http://www.openmhealth.org/media/viz_example_user_options.png "Configured Chart")

### Quantization

Quantization reduces the dataset's size by summarizing each group of points that fall into a common time range, or "bucket," with a single point that represents their bucket's range.

Currently, quantized data point values within each subsequent quantization bucket are *summed*. This is useful for additive measures like `step_count`, which accumulate naturally over time. It should not be used for measures that are not additive, such as `blood_pressure`.

If you wish to configure the `timeQuantizationLevel` for a measure, you will need the following constants:

* `OMHWebVisualizations.DataParser.QUANTIZE_YEAR`
* `OMHWebVisualizations.DataParser.QUANTIZE_MONTH`
* `OMHWebVisualizations.DataParser.QUANTIZE_DAY`
* `OMHWebVisualizations.DataParser.QUANTIZE_HOUR`
* `OMHWebVisualizations.DataParser.QUANTIZE_MINUTE`
* `OMHWebVisualizations.DataParser.QUANTIZE_SECOND`
* `OMHWebVisualizations.DataParser.QUANTIZE_MILLISECOND`
* `OMHWebVisualizations.DataParser.QUANTIZE_NONE`

These can be used in an `options` object as follows:

```javascript
// an example of some options for a distance chart
var options = {
    'measures': {
      'distance': {
          'valueKeyPath': 'body.distance.value',
          'range': { 'min':0, 'max':10000 },
          'units': 'm',
          'timeQuantizationLevel': OMHWebVisualizations.DataParser.QUANTIZE_MONTH,
          'seriesName': 'Distance',
          'chart': {
              'type' : 'clustered_bar',
              'daysShownOnTimeline': { 'min': 90, 'max': 365 }
          }
      }
    }
};
```
#### Quantization Example

Here is a chart of some *unquantized* data:
![Unquantized Data](http://www.openmhealth.org/media/viz_example_unquantized_data.png "Unquantized Data")

As an example, the data will be quantized by hour using `OMHWebVisualizations.DataParser.QUANTIZE_HOUR`. Thus all points in the hour from 04:00 to 05:00 will be *summed* into a single point. The *unquantized* points in this hour are shown below in a zoomed-in view of the minutes just before 05:00:
![Unquantized Data Detail](http://www.openmhealth.org/media/viz_example_unquantized_data_detail1.png "Unquantized Data Detail")

And here is a chart of the same data *quantized* by hour. The points before 05:00 in the zoomed-in view above have been accumulated into a single point, shown in dark blue:
![Quantized Data](http://www.openmhealth.org/media/viz_example_quantized_data.png "Quantized Data")

### Thresholds

Lines representing thresholds can be drawn on charts. Each line is labelled with its `y` value, unless that label will overlap another threshold's label. Here are two maximum thresholds with default appearance:
![Default Maximum Thresholds](http://www.openmhealth.org/media/viz_example_threshold_basic.png "Default Maximum Thresholds")

Thresholds of type `max` and `min` can be specified using the `options` parameter, passed in during construction ([see 'Configuring a Chart'](#configuring_a_chart)). For some measures, thresholds are enabled by default. To disable them for just one measure, set the measure's `thresholds` setting to `undefined` in the `options` object. To disable thresholds entirely, the `userInterface.thresholds.show` property of the `options` object can be set to `false`.

To configure the individual thresholds for a measure, a `thresholds` property can be added to the measure's section in the `options` object. The `thresholds` property must be specified as a single threshold object. In the threshold object, a `min` and a `max` field can be specified.

Property | Description
---: | ---
*max* | A maximum value. Above this value, points will be colored according to the default styles returned by ChartStyles.getDefaultStylesForPlot().
*min* | A minimum value. Below this value, points will be colored according to the default styles returned by ChartStyles.getDefaultStylesForPlot().

On a chart of type `line`, a labeled horizontal rule is drawn all the way across the chart for each threshold, and the points are colored differently, depending on where they fall in relation to the thresholds.

By default, a point is colored differently if it exceeds a `max` threshold or falls below a `min` threshold. This is achieved by the settings returned by ChartStyles.getDefaultStylesForPlot(). By default, this is set to the light orange color in the previous example.

### Extending the default thresholds with ChartStyles

To add more thresholds and change the colors of the points they affect, you can call `chart.addGridline()` and customize the chart's `ChartStyles` object before rendering the chart.
Below are some examples of what can be done. See `examples/charts.html` for code samples.

Change the color of points above the threshold:
![Above Threshold Color](http://www.openmhealth.org/media/viz_example_threshold_color.png "Above Threshold Color")

Add a range in the chart that is colored differently:
![Above Threshold Color with Colored Range](http://www.openmhealth.org/media/viz_example_threshold_color_band.png "Above Threshold Color with Colored Range")

###Tooltips

Tooltips can be enabled, disabled, and configured using the `userInterface.tooltips` property of the `options` object passed into the constructor ([see 'Configuring a Chart'](#configuring_a_chart)). The properties of `userInterface.tooltips` are explained in the following table:

Property | Description
---: | ---
*enabled* | Whether to show tooltips when the user hovers on a point.
*timeFormat* | A string representing the [time format](http://momentjs.com/docs/#/displaying/format/) for the time field in the tooltip.
*decimalPlaces* | The number of decimal places to show by default when rendering a data point value in the tooltip.
*contentFormatter* | A function that takes a D3 data point and returns a string. Used to render the data point in the tooltip. If undefined, the data point's `y` value will be truncated by a default formatter to the number of decimal places specified in the `decimalPlaces` parameter and converted to a string.
*grouped* | Whether to show a single common tooltip for data points of different measure types that are found together in the body of a single data point.


In the following chart, we see a tooltip that has been colored light orange to match its point in the diastolic blood pressure series:

![Above Threshold Tooltip](http://www.openmhealth.org/media/viz_example_threshold_above_tip_2.png "Above Threshold Tooltip")

And here is the CSS used for the tooltip:
```css
.omh-tooltip.above .value {
  color: #e8ac4e;
}
```


You can restrict the tooltip colors to only `diastolic_blood_pressure` as follows:
```css
.omh-tooltip.diastolic_blood_pressure.above .value {
  color: #e8ac4e;
}
```


In the same chart, we see a tooltip that has been colored red to match its point in the systolic blood pressure series:
![Above Threshold Tooltip with Custom Color](http://www.openmhealth.org/media/viz_example_threshold_above_tip_1.png "Above Threshold Tooltip with Custom Color")

Here is the CSS used for the systolic tooltip:
```css
.omh-tooltip.systolic_blood_pressure.above .value {
  color:#ce5050;
}
```


And again, in the same chart, we see a tooltip that has been colored light orange to match its point in the first measure:
![Within Threshold Tooltip with Custom Color](http://www.openmhealth.org/media/viz_example_threshold_warning_tip.png "Within Threshold Tooltip with Custom Color")

Here is more CSS used for any tooltips shown within a threshold named `warning`:
```css
.omh-tooltip.warning .value {
   color:#e8ac4e;
}
```
In order for this to work, the corresponding style's `name` property is set to `warning` as follows:
```javascript
{
   'name': 'warning',
   'filters': chartStyles.filters.above( 129 ),
   'attributes':{ 'fill': '#e8ac4e', 'stroke': '#745628' }
}
```
(where chartStyles is an instance of OMHWebVisualizations.ChartStyles)

See `examples/charts.html` for code samples.


###Rendering a chart

Once a chart has been constructed, it must be rendered to an `<svg>` element. Render the chart by calling:

```javascript
chart.renderTo( svgElement );
```

###Further customizations

After a chart has been constructed, but *before it is rendered*, you may choose to get the Plottable components and make further modifications that are not afforded by the constructor's `options` parameter. Get the Plottable components, modify them, and render the chart as follows:

```javascript

// construct chart here...

if (chart.initialized) {
   
   var components = chart.getComponents();

   // modify plottable components here...

   chart.renderTo( svgElement );

}

```

To see an example of component modification, check out the `examples/charts.html` file in this repository.

###Destroying a chart

In order to free up resources or re-use an element for a new chart, the chart and all of its interactive features can be destroyed with:

```javascript
chart.destroy();
```

###Contributing

To contribute to this repository

1. Open an [issue](https://github.com/openmhealth/web-visualizations/issues) to let us know what you're going to work on.
  1. This lets us give you feedback early and lets us put you in touch with people who can help.
2. Fork this repository.
3. Create your feature branch from the `develop` branch.
4. Commit and push your changes to your fork.
5. Create a pull request.
