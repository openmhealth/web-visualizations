/*!
 * gulp
 * $ npm install gulp-less gulp-autoprefixer gulp-minify-css gulp-jshint gulp-concat gulp-uglify gulp-notify gulp-rename gulp-livereload gulp-cache del --save-dev
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