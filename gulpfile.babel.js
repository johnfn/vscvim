// TODO - this is using es6 now, could clean up.

var gulp       = require('gulp');
var sourcemaps = require('gulp-sourcemaps');
var babel      = require('gulp-babel');
var debug      = require('gulp-debug');
var ts         = require('gulp-typescript');

var tsServerProject = ts.createProject('./tsconfig.json', {
  typescript: require('typescript')
})

gulp.task('compile-ts', function() {
  return gulp
    .src('./src/*.ts')
    .pipe(debug({title: 'build:'}))
    .pipe(sourcemaps.init())
      .pipe(ts(tsServerProject))
      .pipe(babel({
        presets: ['es2015'],
        plugins: ['transform-runtime']
      }))
    .pipe(sourcemaps.write(".", { sourceRoot: "./../src" }))
    .pipe(gulp.dest('./out'))
    .on('error', function (err) { console.error(err); });
});

gulp.task('default', ['compile-ts'], function() {
  gulp.watch('./**/*.ts', ['compile-ts']);
})
