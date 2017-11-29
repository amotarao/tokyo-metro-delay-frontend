var gulp = require('gulp'),
    sass = require('gulp-sass'),
    autoprefixer = require('gulp-autoprefixer'),
    plumber = require('gulp-plumber'),
    notify = require('gulp-notify'),
    uglify = require('gulp-uglify'),
    svgmin = require('gulp-svgmin'),
    htmlmin = require('gulp-htmlmin'),
    sourcemaps = require('gulp-sourcemaps'),
    browserSync = require('browser-sync').create(),
    mmq = require('gulp-merge-media-queries'),
    cssmin = require('gulp-cssmin'),
    concat = require('gulp-concat'),
    manifest = require('gulp-appcache')
    runSequence = require('run-sequence');

const srcPath = './src',
      destPath = './dist',
      prefixBrowsers = ['last 2 version', 'iOS >= 8.1', 'Android >= 4.4'];

gulp.task('sass', function() {
  gulp.src(srcPath + '/sass/**/style.scss')
    .pipe(plumber({
      errorHandler: notify.onError("<%= error.message %>")
    }))
    .pipe(sourcemaps.init())
    .pipe(sass({
      outputStyle: 'expanded'
    }))
    .pipe(mmq({}))
    .pipe(autoprefixer({
      browsers: prefixBrowsers,
      cascade: false
    }))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(destPath + '/css'))
    .pipe(browserSync.stream());
});

gulp.task('sass-min', function() {
  gulp.src(srcPath + '/sass/**/style.scss')
    .pipe(plumber({
      errorHandler: notify.onError("<%= error.message %>")
    }))
    .pipe(sass({
      outputStyle: 'expanded'
    }))
    .pipe(mmq({}))
    .pipe(autoprefixer({
      browsers: prefixBrowsers,
      cascade: false
    }))
    .pipe(cssmin())
    .pipe(gulp.dest(destPath + '_min/css'))
    .pipe(browserSync.stream());
});

gulp.task('js', function() {
  gulp.src(srcPath + '/js/**/*.js')
    .pipe(plumber({
      errorHandler: notify.onError("<%= error.message %>")
    }))
    .pipe(sourcemaps.init())
    .pipe(concat('main.js'))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(destPath + '/js'))
    .pipe(browserSync.stream());
});

gulp.task('js-min', function() {
  gulp.src(srcPath + '/js/**/*.js')
    .pipe(plumber({
      errorHandler: notify.onError("<%= error.message %>")
    }))
    .pipe(uglify())
    .pipe(concat('main.js'))
    .pipe(gulp.dest(destPath + '_min/js'))
    .pipe(browserSync.stream());
});

gulp.task('html', function() {
  gulp.src(srcPath + '/**/*.html')
    .pipe(plumber({
      errorHandler: notify.onError("<%= error.message %>")
    }))
    .pipe(gulp.dest(destPath))
    .pipe(browserSync.stream());
});

gulp.task('html-min', function() {
  gulp.src(srcPath + '/**/*.html')
    .pipe(plumber({
      errorHandler: notify.onError("<%= error.message %>")
    }))
    .pipe(htmlmin({
      collapseWhitespace: true,
      removeComments: true
    }))
    .pipe(gulp.dest(destPath + '_min'))
    .pipe(browserSync.stream());
});

gulp.task('svg', function() {
  gulp.src(srcPath + '/svg/**/*.svg')
  .pipe(svgmin())
  .pipe(gulp.dest(destPath + '/img'));　
});

gulp.task('svg-min', function() {
  gulp.src(srcPath + '/svg/**/*.svg')
  .pipe(svgmin())
  .pipe(gulp.dest(destPath + '_min/img'));　
});

gulp.task('copy-direct', function() {
  gulp.src(['./static/**/*', './static/**/.htaccess'], {base: 'static'})
  .pipe(gulp.dest(destPath));　
});

gulp.task('copy-direct-min', function() {
  gulp.src(['./static/**/*', './static/**/.htaccess'], {base: 'static'})
  .pipe(gulp.dest(destPath + '_min'));　
});

gulp.task('manifest', function() {
  gulp.src(destPath + '_min/**')
    .pipe(manifest({
      hash: true,
      preferOnline: true,
      network: ['http://*', 'https://*', '*'],
      filename: 'manifest.appcache',
      exclude: ['manifest.appcache', 'sitemap.xml']
     }))
    .pipe(gulp.dest(destPath + '_min'));
});

gulp.task('watch', ['serve'], function() {
  gulp.watch(srcPath + '/sass/**/*.scss', ['sass']);
  gulp.watch(srcPath + '/js/**/*.js', ['js']);
  gulp.watch(srcPath + '/**/*.html', ['html']);
  gulp.watch(['./static/**/*', './static/**/.htaccess'], ['copy-direct']);
});

gulp.task('minify', function() {
  return runSequence(
    ['sass-min', 'js-min', 'html-min', 'copy-direct-min'],
    'manifest'
  )
});

gulp.task('serve', function() {
  browserSync.init({
    server: destPath
  });
  gulp.watch(destPath + '/**/*.html').on('change', browserSync.reload);
});

gulp.task('default', function() {
  gulp.run('watch');
});
