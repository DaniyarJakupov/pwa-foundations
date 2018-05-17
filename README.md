
#### Project setup


```
yarn
```

Generate certificates by running

```
npm run prepcerts
```

To start the server, run

```sh
npm run watch
```

# How to use it

#### Generate x509 Certificates for serving over HTTPS

`npm run prepcerts`

#### Start the Development Server

To start the development server, run

```sh
npm run watch
```

If you want, you can start the API and UI independently, by running

```sh
npm run watch:api # API only
npm run watch:ui # UI only
```

#### Build Development Assets in the `/dist` folder

This will be an un-minified version of an exercise, and will include some webpack-specific tooling, intended only for development use

`npm run build:dev`

#### Build Production Assets in the `/dist` folder

This will be an an optimized version of the exercise

`npm run build:dist`

#### Run tests

`npm test`

#### Clean old builds

`npm run clean`

# What are the pieces?

* [Webpack 3](https://webpack.js.org)
* [Babel](http://babeljs.io/) 7.x, setup with the [babel-preset-env](https://github.com/babel/babel/tree/7.0/packages/babel-preset-env) plugins, compiling to ES5 JavaScript
* [ESLint](https://github.com/eslint/eslint) for linting JS and JSX
* [sass-loader](https://github.com/webpack-contrib/sass-loader) for traditional management of [Sass](http://sass-lang.com/) styles
* [extract-text-webpack-plugin](https://github.com/webpack-contrib/extract-text-webpack-plugin) so compiled styles are external stylesheets instead of inline style blocks
* [React](http://facebook.github.io/react/) as a component library
* [MUI](https://www.muicss.com/) as a lightweight (6.6K) Material Design inspired UI kit
* [Jest](http://facebook.github.io/jest/) as a testing platform
* [SimpleHTTP2Server](https://github.com/GoogleChrome/simplehttp2server) as a HTTP/2 proxy (for development only)
* [SQLite3](https://www.sqlite.org/) - as a lightweight, embedded database (for API)
* [Express](http://expressjs.com/) - as a HTTP server for our API.
