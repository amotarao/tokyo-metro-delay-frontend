var gulp = require('gulp');
var sass = require('gulp-sass');
var compass = require('gulp-compass');
var autoprefixer = require('gulp-autoprefixer');
var plumber = require('gulp-plumber');
var notify  = require('gulp-notify');
var uglify = require('gulp-uglify');
var svgmin = require('gulp-svgmin');
var htmlmin = require('gulp-htmlmin');
var sourcemaps = require('gulp-sourcemaps');

gulp.task('sass', function() {
  gulp.src('./src/sass/**/style.scss')
    .pipe(plumber({
      errorHandler: notify.onError("<%= error.message %>")
    }))
    .pipe(sourcemaps.init())
    .pipe(sass({
      outputStyle: 'compressed'
    }))
    .pipe(autoprefixer({
      browsers: ['last 2 version', 'iOS >= 8.1', 'Android >= 4.4'],
      cascade: false
    }))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('./dist/css'));
});

gulp.task('js', function(){
  gulp.src('./src/js/script.js')
    .pipe(plumber({
      errorHandler: notify.onError("<%= error.message %>")
    }))
    .pipe(sourcemaps.init())
    .pipe(uglify())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('./dist/js'));
});

gulp.task('html', function(){
  gulp.src('./src/**/*.html')
    .pipe(plumber({
      errorHandler: notify.onError("<%= error.message %>")
    }))
    .pipe(htmlmin({
      collapseWhitespace: true
    }))
    .pipe(gulp.dest('./dist'));
});

gulp.task('svg', function() {
  gulp.src('./src/svg/**/*.svg')
  .pipe(svgmin())
  .pipe(gulp.dest('./dist/img/'));　
});

gulp.task('watch', function(){
  gulp.watch('./src/sass/**/*.scss', ['sass']);
  gulp.watch('./src/js/**/*.js', ['js']);
  gulp.watch('./src/**/*.html', ['html']);
});

gulp.task('default', function(){
  gulp.run('watch');
});
