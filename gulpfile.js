/*!
 * gulp
 * $ npm install gulp-less gulp-autoprefixer gulp-minify-css gulp-jshint gulp-concat gulp-uglify gulp-notify gulp-rename gulp-livereload gulp-cache del --save-dev
 */
/*
 * Copyright 2015 Open mHealth
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

//Load Karma
var KarmaServer = require('karma').Server;

// Load plugins
var gulp = require('gulp'),
    less = require('gulp-less'),
    autoprefixer = require('gulp-autoprefixer'),
    minifycss = require('gulp-minify-css'),
    jshint = require('gulp-jshint'),
    uglify = require('gulp-uglify'),
    rename = require('gulp-rename'),
    concat = require('gulp-concat'),
    notify = require('gulp-notify'),
    cache = require('gulp-cache'),
    connect = require('gulp-connect'),
    // livereload = require('gulp-livereload'),
    del = require('del');

// Styles
gulp.task('generate-concatenated-styles', function() {
  return gulp.src(['src/*.less','!src/styles-common.less'])
    .pipe(concat('omh-web-visualizations-all.css'))
    .pipe(less())
    .pipe(autoprefixer('last 2 version'))
    .pipe(gulp.dest('dist'))
    .pipe(rename({ suffix: '.min' }))
    .pipe(minifycss())
    .pipe(gulp.dest('dist'))
    .pipe(notify({ message: 'Concatenated styles task complete' }));
});
gulp.task('generate-component-styles', function() {
  return gulp.src(['src/*.less','!src/styles-common.less'])
    .pipe(less())
    .pipe(autoprefixer('last 2 version'))
    .pipe(rename({ prefix: 'omh-web-visualizations-' }))
    .pipe(gulp.dest('dist/components'))
    .pipe(rename({ suffix: '.min' }))
    .pipe(minifycss())
    .pipe(gulp.dest('dist/components'))
    .pipe(notify({ message: 'Component styles task complete' }));
});

// Scripts
gulp.task('generate-concatenated-script', function() {
  return gulp.src('src/*.js')
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('default'))
    .pipe(concat('omh-web-visualizations-all.js'))
    .pipe(gulp.dest('dist'))
    .pipe(rename({ suffix: '.min' }))
    .pipe(uglify())
    .pipe(gulp.dest('dist'))
    .pipe(notify({ message: 'Scripts concat task complete' }));
});
gulp.task('generate-component-scripts', function(){
  return gulp.src('src/*.js')
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('default'))
    .pipe(rename({ prefix: 'omh-web-visualizations-' }))
    .pipe(gulp.dest('dist/components'))
    .pipe(rename({ suffix: '.min' }))
    .pipe(uglify())
    .pipe(gulp.dest('dist/components'))
    .pipe(notify({ message: 'Scripts copy task complete' }));
});

// Run test once and exit
gulp.task('test-scripts', function (done) {
  new KarmaServer({
    configFile: __dirname + '/karma.conf.js',
    singleRun: true,
    autoWatch: false
    }, function() {
        done();
  }).start();
});

// Watch for file changes and re-run tests on each change
gulp.task('tdd', function (done) {
  new KarmaServer({
    configFile: __dirname + '/karma.conf.js'
  }, done).start();
});

// Clean
gulp.task('clean', function(cb) {
    del(['dist'], cb);
});

// Default task
gulp.task('default', ['clean'], function() {
    gulp.start(['generate-component-styles','generate-concatenated-styles'], ['generate-component-scripts','generate-concatenated-script']);
});

// Watch
gulp.task('watch', function() {

  // Watch .scss files
  gulp.watch('src/*.less', ['generate-component-styles','generate-concatenated-styles']);

  // Watch .js files
  gulp.watch(['src/*.js','test/*.js'], ['test-scripts','generate-component-scripts','generate-concatenated-script']);

  // Create LiveReload server
  // livereload.listen();

  // Watch any files in dist/, reload on change
  gulp.watch(['dist/**']).on('change', connect.reload);

  connect.server({
    livereload: true
  });
  

});