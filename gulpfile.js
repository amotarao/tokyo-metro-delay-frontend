var gulp = require('gulp');
var sass = require('gulp-sass');
var autoprefixer = require('gulp-autoprefixer');
var plumber = require('gulp-plumber');
var notify = require('gulp-notify');
var uglify = require('gulp-uglify');
var svgmin = require('gulp-svgmin');
var htmlmin = require('gulp-htmlmin');
var sourcemaps = require('gulp-sourcemaps');
var browserSync = require('browser-sync').create();
var mmq = require('gulp-merge-media-queries');
var cssmin = require('gulp-cssmin');
var concat = require('gulp-concat');

gulp.task('sass', function() {
  gulp.src('./src/sass/**/style.scss')
    .pipe(plumber({
      errorHandler: notify.onError("<%= error.message %>")
    }))
    .pipe(sourcemaps.init())
    .pipe(sass({
      outputStyle: 'expanded'
    }))
    .pipe(mmq({}))
    .pipe(autoprefixer({
      browsers: ['last 2 version', 'iOS >= 8.1', 'Android >= 4.4'],
      cascade: false
    }))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('./dist/css'))
    .pipe(browserSync.stream());
});

gulp.task('sass-min', function() {
  gulp.src('./src/sass/**/style.scss')
    .pipe(plumber({
      errorHandler: notify.onError("<%= error.message %>")
    }))
    .pipe(sass({
      outputStyle: 'expanded'
    }))
    .pipe(mmq({}))
    .pipe(autoprefixer({
      browsers: ['last 2 version', 'iOS >= 8.1', 'Android >= 4.4'],
      cascade: false
    }))
    .pipe(cssmin())
    .pipe(gulp.dest('./dist_min/css'))
    .pipe(browserSync.stream());
});

gulp.task('js', function(){
  gulp.src('./src/js/**/*.js')
    .pipe(plumber({
      errorHandler: notify.onError("<%= error.message %>")
    }))
    .pipe(sourcemaps.init())
    .pipe(concat('main.js'))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('./dist/js'))
    .pipe(browserSync.stream());
});

gulp.task('js-min', function(){
  gulp.src('./src/js/**/*.js')
    .pipe(plumber({
      errorHandler: notify.onError("<%= error.message %>")
    }))
    .pipe(uglify())
    .pipe(concat('main.js'))
    .pipe(gulp.dest('./dist_min/js'))
    .pipe(browserSync.stream());
});

gulp.task('html', function(){
  gulp.src('./src/**/*.html')
    .pipe(plumber({
      errorHandler: notify.onError("<%= error.message %>")
    }))
    .pipe(gulp.dest('./dist'))
    .pipe(browserSync.stream());
});

gulp.task('html-min', function(){
  gulp.src('./src/**/*.html')
    .pipe(plumber({
      errorHandler: notify.onError("<%= error.message %>")
    }))
    .pipe(htmlmin({
      collapseWhitespace: true
    }))
    .pipe(gulp.dest('./dist_min'))
    .pipe(browserSync.stream());
});

gulp.task('svg', function() {
  gulp.src('./src/svg/**/*.svg')
  .pipe(svgmin())
  .pipe(gulp.dest('./dist/img'));　
});

gulp.task('copy-direct', function() {
  gulp.src(['./src_direct/**/*', './src_direct/**/.htaccess'], {base: 'src_direct'})
  .pipe(gulp.dest('./dist'));　
});

gulp.task('copy-direct-min', function() {
  gulp.src(['./src_direct/**/*', './src_direct/**/.htaccess'], {base: 'src_direct'})
  .pipe(gulp.dest('./dist_min'));　
});

gulp.task('watch', ['serve'], function(){
  gulp.watch('./src/sass/**/*.scss', ['sass']);
  gulp.watch('./src/js/**/*.js', ['js']);
  gulp.watch('./src/**/*.html', ['html']);
  gulp.watch(['./src_direct/**/*', './src_direct/**/.htaccess'], ['copy-direct']);
});

gulp.task('minify', ['sass-min', 'js-min', 'html-min', 'copy-direct-min']);

gulp.task('serve', function(){
  browserSync.init({
    server: './dist'
  });
  gulp.watch('./dist/**/*.html').on('change', browserSync.reload);
});

gulp.task('default', function(){
  gulp.run('watch');
});
