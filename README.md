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
*element* | A dom element, such as a `<div>` containing an `<svg>` node. This can also be a jQuery object.
*measureList* | A string containing a comma-separated list of Open mHealth measures to display.
*options* | An object with [settings](#configuring_a_chart) for the chart. If this is omitted or if an empty object is passed in, the function uses the default settings explained below.

The easiest way to create data points to pass to the `data` parameter is to use our [sample data generator](https://github.com/openmhealth/sample-data-generator). You can either use a pre-generated [data set](https://github.com/openmhealth/sample-data-generator/releases/download/v1.0.0/one-year-of-data.json.gz), or download the generator itself to create data that fits your needs.

###Configuring a chart

The `options` parameter of the `OMHWebVisualization.Chart(...)` function is divided into two sections. A `userInterface` section controls the UI of the chart as a whole. The `measures` section contains settings that customize charts for specific measures. 

The following object is the default settings object used by the `OMHWebVisualization.Chart(...)` function when its `options` parameter is empty. You can specify any subset of these settings to override them:

```javascript
{
  'userInterface': {
    'toolbar': { 'enabled': true },
    'timespanButtons': { 'enabled': true },
    'zoomButtons': { 'enabled': true },
    'navigation': { 'enabled': true },
    'tooltips': {
      'enabled': true,
      'timeFormat': 'M/D/YY, h:mma'
     },
    'panZoom': {
      'enabled': true,
      'showHint': true
    },
  },
  'measures': {
    'body_weight' : {
      'valueKeyPath': 'body.body_weight.value',
      'range': { 'min':0, 'max':100 },
      'units': 'kg',
      'thresholds': { 'max':57 },
    },
    'heart_rate': {
      'valueKeyPath': 'body.heart_rate.value',
      'range': { 'min':30, 'max':150 },
      'units': 'bpm',
    },
    'step_count': {
      'valueKeyPath': 'body.step_count',
      'range': { 'min':0, 'max':1500 },
      'units': 'Steps',
      'seriesName': 'Steps',
      'chart': {
        'type':'clustered_bar',
        'barColor' : '#eeeeee',
        'daysShownOnTimeline': { 'min':7, 'max':90 },
      },
    },
    'minutes_moderate_activity': {
      'valueKeyPath': 'body.minutes_moderate_activity.value',
      'range': { 'min':0, 'max':300 },
      'units': 'Minutes',
      'seriesName': 'Minutes of moderate activity',
      'chart': {
        'type':'clustered_bar',
        'daysShownOnTimeline': { 'min':7, 'max':90 },
      },
    },
    'systolic_blood_pressure': {
      'valueKeyPath': 'body.systolic_blood_pressure.value',
      'range': { 'min':30, 'max':200 },
      'units': 'mmHg',
      'thresholds':  { 'max':120 },
    },
    'diastolic_blood_pressure': {
      'valueKeyPath': 'body.diastolic_blood_pressure.value',
      'range': { 'min':30, 'max':200 },
      'units': 'mmHg',
      'thresholds':  { 'max':80 },
    }
  }
}
```

For example, using these default settings to graph `heart_rate` data will generate a chart that looks like this:

![Configured Chart](http://www.openmhealth.org/media/viz_example_default_options.png "Default Chart")

If you look carefully at the default settings object, you'll also notice that some measure settings have more properties than others. When a property is missing, the following default settings are assumed. 

```javascript
{
  'range': { 'min':0, 'max':100 },
  'units': 'Units',
  'seriesName': 'Series',
  'chart': {
    'type':'line',
    'pointSize': 9,
    'lineColor' : '#dedede',
    'pointFillColor' : '#4a90e2',
    'pointStrokeColor' : '#0066d6',
    'aboveThesholdPointFillColor' : '#e8ac4e',
    'aboveThesholdPointStrokeColor' : '#745628',
    'barColor' : '#4a90e2',
    'daysShownOnTimeline': { 'min':1, 'max':1000 },
  },
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

#### Quantization configuration

If you wish to configure the `timeQuantizationLevel` for a measure, you will need the following constants:

* `OMHWebVisualizations.QUANTIZE_YEAR`
* `OMHWebVisualizations.QUANTIZE_MONTH`
* `OMHWebVisualizations.QUANTIZE_DAY`
* `OMHWebVisualizations.QUANTIZE_HOUR`
* `OMHWebVisualizations.QUANTIZE_MINUTE`
* `OMHWebVisualizations.QUANTIZE_SECOND`
* `OMHWebVisualizations.QUANTIZE_MILLISECOND`
* `OMHWebVisualizations.QUANTIZE_NONE`

These can be used in an `options` object as follows:

```javascript
// an example of some options for a distance chart
var options = {
    'measures': {
      'distance': {
          'valueKeyPath': 'body.distance.value',
          'range': { 'min':0, 'max':10000 },
          'units': 'm',
          'timeQuantizationLevel': OMHWebVisualizations.QUANTIZE_MONTH,
          'seriesName': 'Distance',
          'chart': {
              'type' : 'clustered_bar',
              'daysShownOnTimeline': { 'min': 90, 'max': 365 }
          }
      }
    }
};
```

###Rendering a chart

Once a chart has been constructed, it must be rendered to an `<svg>` element. Render the chart by calling:

```javascript
chart.renderTo( svgElement );
```

###Further customizations

After a chart has been constructed, but *before it is rendered*, you may choose to get the Plottable components and make further modifications that are not afforded by the constructor's `options` parameter. Get the Plottable components, modify them, and render the chart by calling:

```javascript
var components = chart.getComponents();

// modify plottable components here...

chart.renderTo( svgElement );
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
