// Karma configuration
// Generated on Tue Sep 02 2014 23:03:20 GMT+0200 (CEST)

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: './',

    plugins : [
        // 'karma-browserify',
        'karma-jasmine',
        'karma-phantomjs-launcher',
        'karma-notify-reporter',
        // 'karma-chrome-launcher',
        // 'karma-firefox-launcher'
    ],

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    // frameworks: ['browserify', 'mocha'],
    frameworks: ['jasmine'],

    // list of files / patterns to load in the browser
    files: [
      'src/*.js',
      'test/*.js'
    ],


    // list of files to exclude
    exclude: [
    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      // 'app/js/**/*.js*': [ 'browserify' ],
      // 'test/components/*.jsx': [ 'browserify' ],
      // 'test/utils/*.js': [ 'browserify' ]
    },

    // browserify: {
    //   debug: true,
    //   extensions: ['.js', '.jsx'],
    //   transform: ['rewireify'],
    //   configure: function(bundle) {
    //     bundle.once('prebundle', function() {
    //       bundle.transform('reactify');
    //     });
    //   }
    // },

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress','notify'],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
     browsers: ['PhantomJS'],


    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true,

    notifyReporter: {
      reportEachFailure: true, // Default: false, Will notify on every failed sepc 
      reportSuccess: false, // Default: true, Will notify when a suite was successful 
    }

  });
};