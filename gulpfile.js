const gulp = require("gulp");
const gutil = require("gulp-util");
const babel = require("gulp-babel");
const rollup = require("rollup");
const rollupTypescript = require("rollup-plugin-typescript");
const uglify = require("gulp-uglify");
const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');

const moduleName = "FlowchartSvg";
const moduleDistPath = `./demos/${moduleName}.js`;

gulp.task("build", function () {
  return rollup
    .rollup({
      input: "./src/index.ts",
      plugins: [rollupTypescript(), babel()]
    })
    .then(function (bundle) {
      bundle.write({
        format: "iife",
        moduleName: moduleName,
        dest: moduleDistPath,
        sourceMap: true
      });
    });
});

// babel es6 -> es5
gulp.task("babel", ["build"], function () {
  return gulp
    .src(moduleDistPath)
    .pipe(
      babel({
        presets: ["@babel/env"]
      })
    )
    .on("error", function (err) {
      gutil.log(gutil.colors.red("[Error]"), err.toString());
    })
    .pipe(gulp.dest("./dist"));
});

// 编译并压缩js
gulp.task("convertJS", ["babel"], function () {
  return gulp
    .src(moduleDistPath)
    .pipe(
      uglify({
        mangle: {
          reserved: ["FlowchartSvg", "require", "exports", "module", "$"]
        } //排除混淆关键字
      })
    )
    .on("error", function (err) {
      gutil.log(gutil.colors.red("[Error]"), err.toString());
    })
    .pipe(gulp.dest("./dist"));
});

gulp.task("default", ["babel"]);