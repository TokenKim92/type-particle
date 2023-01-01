# type-particle

A project to show how many animation effects can be shown in HTML5.

A library of type effects that animate text in windows.

This project includes a webpack config file to package this project into a library for easier use.( use `npm run build` or `npm run build-prod` )

## How to use

This is really all you need to get going.

```html
<h1 id="type">Dresden</h1>
```

```js
import TypeParticle from './src/TypeParticle.js';

new TypeParticle('type').start();
```

You need to write your text in plain HTML tags with id and insert it as a parameter of your TypeFill class.

It has three main functions: `start()`, `stop()` and `restart()`.

As the name suggests. This is a function to start, stop and restart animations.

## Parameter of class

`TypeParticle(elementId, spreadSpeed, spreadMode)`

1. `elementId`: the id of html tag ( Any ID can be used )
2. `spreadSpeed`: the speed at which particles are collected to create text animations. The type is `Number` and must be between 0 and 100. The default speed is `10`.
3. `spreadMode`: particle collection mode. This type is a `String`. There are seven modes: `'horizontal'`, `'vertical'`, `'left'`,`'top'`,`'right'`, `'bottom'` and `'all-side'`. The default type is `all-side`.

for example

```js
const type = new TypeParticle('type', 5, 'horizontal');
```

## Used tools

- JavaScript

This is a pure JavaScript library with no other libraries. So you don't need to install any other libraries to use or contribute to this project.

## Overview

Take a look at this site to see how to animate as a example.

https://tokenkim92.github.io/type-particle/
