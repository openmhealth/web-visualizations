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
    livereload = require('gulp-livereload'),
    del = require('del');

// Styles
gulp.task('concatenated-styles', function() {
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
gulp.task('component-styles', function() {
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
gulp.task('concatenated-script', function() {
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
gulp.task('component-scripts', function(){
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


// Clean
gulp.task('clean', function(cb) {
    del(['dist'], cb);
});

// Default task
gulp.task('default', ['clean'], function() {
    gulp.start(['component-styles','concatenated-styles'], ['component-scripts','concatenated-script']);
});

// Watch
gulp.task('watch', function() {

  // Watch .scss files
  gulp.watch('src/*.less', ['component-styles','concatenated-styles']);

  // Watch .js files
  gulp.watch('src/*.js', ['component-scripts','concatenated-script']);

  // Create LiveReload server
  livereload.listen();

  // Watch any files in dist/, reload on change
  gulp.watch(['dist/**']).on('change', livereload.changed);

});