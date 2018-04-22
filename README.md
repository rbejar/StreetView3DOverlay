# StreetView3DOverlay

An example showing how to overlay 3D models on interactive Google Street View Panoramas using [three.js](http://threejs.org/). 

You can "try before you buy" :-P <http://rbejar.github.io/streetviewdemo/StreetView3DOverlay.html>. That is not the same code included in this repository, but the differences are negligible.

It shows a 3D model (a ferris wheel) placed on a parking lot (behind my building at [EINA - Universidad de Zaragoza](http://eina.unizar.es)) with a Google Street View Panorama as the background. You can change the viewpoint and zoom in and out, and the model keeps its position and rotates as the viewpoint changes. You can also change the panorama, among a fixed set of them, by clicking the spacebar to see the 3D wheel in its place from different points. The panoramas are included via the API offered by Google, but the user interaction (keys, mouse) has been developed for the example.

There are a number of parameters related to the Street View Panoramas which have been established by trial-and-error. This means that both the position and orientation of the ferris wheel is not very precise. The method itself is not very precise, as the distortion in the panoramic images is not uniform, and this will be difficult to make up for, but even thus it may be useful for different purposes. 

It works better with WebGL support in the browser, but it will automatically fall back to a simpler version if WebGL support is not detected (thanks three.js!). It has been reported to work at least in the current versions of Firefox in Windows, Linux and Mac OS X, Chrome/ium in Linux and Windows and Internet Explorer 10 in Windows.

The code is not a terrible mess, but it is not following current Web developement standards and it has a few hacks in it (read the comments).


## Credits
The ferris wheel 3D model has been downloaded from <http://www.archibaseplanet.com/download/33b26753.html> and loaded into the scene with the 3DS Loader of three.js.

## three.js
<http://threejs.org/>
The MIT License
Copyright (c) 2010-2013 three.js authors

### jQuery
Copyright 2005, 2013 jQuery Foundation, Inc. and other contributors
Released under the MIT license
<http://jquery.org/license>

### jQuery mouse wheel
Copyright (c) 2013 Brandon Aaron <http://brandon.aaron.sh>
Licensed under the MIT License
Version: 3.1.6
