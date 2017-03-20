/**
 * Copyright 2017 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


const fs = require('fs');
const path = require('path');

const express = require('express');
const nunjucks = require('nunjucks');
const rollup = require('rollup');
const sass = require('node-sass');
const closure = require('google-closure-compiler-js');


// -----------------------------------------------------------------------------
// Compile static assets, which are inlined in our HTML

function compileCSS(path) {
  return Promise.resolve(sass.renderSync({
    file: path,
    outputStyle: 'compressed'
  }).css);
}

function compileJS(path) {
  // Resolve imports using RollupJS, and convert to ES5 using Closure Compiler.
  return rollup.rollup({entry: path})
    .then(bundle => bundle.generate({format: 'iife'}).code)
    .then(code => closure.compile({jsCode: [{src: code}]}).compiledCode);
}

const ASSETS = {};

['styles/app_shell.scss', 'styles/core.scss',
  'service_worker/service_worker.js', 'scripts/app_shell.js'].forEach(file => {
  let compile = (file.split('.')[1] == 'js') ? compileJS : compileCSS;
  compile(file).then(code => { ASSETS[file] = code; });
});


// -----------------------------------------------------------------------------
// Express App.

const pages = fs.readdirSync('pages');
const app = express();

nunjucks.configure('.', {autoescape: true, express: app});

app.use(function(req, res, next) {
  res.locals.assets = ASSETS;
  res.locals.request = req;
  next();
});

app.use(express.static('static'));

for (let p of pages) {
  let url = '/' + p.replace('.html', '').replace('index', '');
  app.get(url, function(req, res) { res.render('pages/' + p); });
}

app.get('/_/offline', function(req, res) {
  res.render('templates/offline.html');
});

app.get('/_/app_shell', function(req, res) {
  res.render('templates/app_shell.html');
});

app.get('/_/install_serviceworker', function(req, res) {
  res.render('templates/install_serviceworker.html');
});

app.get('/service_worker.js', function(req, res) {
  res.setHeader('content-type', 'text/javascript');
  res.write(ASSETS['service_worker/service_worker.js']);
  res.end();
});

app.get('/_/latest_article', function(req, res) {
  // TODO(plegner)
  res.end();
});

app.get('/_/add_subscription', function(req, res) {
  // TODO(plegner)
  res.end();
});

app.get('/_/remove_subscription', function(req, res) {
  // TODO(plegner)
  res.end();
});

app.listen(8080, function() {
  console.log('The API server is running on port 8080.');
});
