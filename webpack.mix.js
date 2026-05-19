const mix = require('laravel-mix');

mix.js('resources/js/revision-ui.js', 'public/js')
   .sass('resources/sass/revision-ui.scss', 'public/css')
   .version();