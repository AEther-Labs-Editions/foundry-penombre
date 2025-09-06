const gulp = require('gulp');
const less = require('gulp-less');
const path = require('path');

/* ----------------------------------------- */
/*  Compile LESS
/*  Affiche les erreurs dans la console
/* ----------------------------------------- */
function compileLESS() {
  return gulp.src("styles/penombre.less")
    .pipe(less({
      paths: [path.join(__dirname, 'styles')]
    }))
    .on('error', function(err) {
      console.error('Erreur LESS:', err.message);
      this.emit('end');
    })
    .pipe(gulp.dest("./css"));
}

const css = gulp.series(compileLESS);

/* ----------------------------------------- */
/*  Watch Updates
/* ----------------------------------------- */
const SIMPLE_LESS = ["styles/**/*.less"];

function watchUpdates() {
  gulp.watch(SIMPLE_LESS, css);
}

/* ----------------------------------------- */
/*  Export Tasks
/* ----------------------------------------- */

exports.default = gulp.series(
  gulp.parallel(css),
  watchUpdates
);
exports.css = css;