/**
    streetviewoverlay.js - 3D Data on Google Street View Visualization
    Copyright (C) 2018 Rubén Béjar {http://www.rubenbejar.com/}
    
    Permission is hereby granted, free of charge, to any person obtaining a copy of
    this software and associated documentation files (the "Software"), to deal in
    the Software without restriction, including without limitation the rights to
    use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
    the Software, and to permit persons to whom the Software is furnished to do so,
    subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
    FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
    COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
    IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
    CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

function StreetViewOverlay() {
    var SVO = {};    
    
    function streetViewPOVChangeListener() {    
        SVO.camera.rotation.x = SVO.streetViewPano.getPov().pitch * SVO.DEG2RAD;
        SVO.camera.rotation.y = - SVO.streetViewPano.getPov().heading * SVO.DEG2RAD;
    }
    
    // Fixed set of panoramas to choose
    var panoramaPos = [[41.684196,-0.888992],[41.685296,-0.888992],
                       [41.684196,-0.887992],[41.684196,-0.889992]];
    var currShownPano = 0;
    
    SVO.PANO_HEIGHT = 3; // For instance...

    SVO.DEFAULT_FOCAL_LENGTH = 25; // Will be using the default 35 mm for frame size
    SVO.STREETVIEW_FOCAL_LENGTH_MULTIPLIER = 15; // Discovered experimentally. Imprecise but
    // a reasonable approximation I think
    // 12 gives a horizontal FOV of 1.57 rads (aprox 90 degrees). With that value,
    // vertically the objects do not fit very well.. ??
    // Besides this, the 3d objects positioning is sligthly different in Firefox and Chromium
    // (now more precise in Firefox...) ?? 
    SVO.STREETVIEW_ZOOM_CONSTANT = 50; // Discovered experimentally. Imprecise.
    SVO.STREETVIEW_DIV_ID = 'streetviewpano';
    SVO.THREEJS_DIV_ID = 'container';
    SVO.DEG2RAD = Math.PI / 180;
    SVO.RAD2DEG = 180 / Math.PI;
    
    SVO.objects3Dmaterial = null;
    
    SVO.currentPanorama = null;
    SVO.scene = new THREE.Scene();
    
    SVO.cameraParams = {focalLength: SVO.DEFAULT_FOCAL_LENGTH};
    SVO.camera = new THREE.PerspectiveCamera( 
            1, 16/9, 1, 1100 ); // When I initalize the camera, I will change fov and aspect
    
    // A spot light
    SVO.light = new THREE.SpotLight(0xffffbb);
    SVO.light.position.set( 200, 400, 400 ); // The position is chosen to be roughly
    // "compatible" with the sun in the panoramas we use
    SVO.light.castShadow = true; // only spotligths cast shadows in ThreeJS (I think...)
        
    SVO.renderer = null;
    
    SVO.$container = null;
    SVO.container = null;    
            
    SVO.dragView = {draggingView: false, mouseDownX: 0, mouseDownY: 0};
            
    SVO.$streetViewPano = null;
    SVO.streetViewPano = null;            
  
    SVO.currentStreetViewZoom = 1;           
                    
    SVO.showing = {streetView: true, objects3D: false};
    
    SVO.mesh = null;
    
    SVO.load = function(showing, mesh, lat, lon, worldOrigin) {
        $(document).ready(function(){
            SVO.showing= $.extend(SVO.showing, showing);
            SVO.mesh = mesh;
	    SVO.worldOrigin = worldOrigin;
            
                      
            if (SVO.showing.webGL) {                
                if (Detector.webgl) {
                    SVO.renderer = new THREE.WebGLRenderer({alpha: true});
                } else {                    
                    SVO.renderer = new THREE.CanvasRenderer();
                    $("#help").append('<p>WebGL not supported. A slower and less pretty version is shown.</p>');
                    $("#help").append('<p><a target="_blank" href="http://www.khronos.org/webgl/wiki_1_15/index.php/Getting_a_WebGL_Implementation">Click here to find out how to activate WebGL support</a></p>');
                }                   
            } else {
                SVO.renderer = new THREE.CanvasRenderer();
                $("#help").append('<p>WebGL not even tried. A slower and less pretty version is shown.</p>');
                $("#help").append('<p><a target="_blank" href="http://www.khronos.org/webgl/wiki_1_15/index.php/Getting_a_WebGL_Implementation">Click here to find out how to activate WebGL support</a></p>');
            }
            SVO.renderer.setClearColor(0x000000, 0); // TRANSPARENT BACKGROUND        
            SVO.renderer.shadowMap.enabled = true; // For shadows to be shown
            
            SVO.$container = $('#' + SVO.THREEJS_DIV_ID);
            SVO.container = SVO.$container.get(0);
            SVO.container.appendChild(SVO.renderer.domElement);
            
            SVO.$streetViewPano = $('#'+SVO.STREETVIEW_DIV_ID);
            SVO.streetViewPano = new google.maps.StreetViewPanorama($('#'+SVO.STREETVIEW_DIV_ID).get(0),
                             {disableDefaultUI: true, scrollwheel: false, clickToGo: false});
            
            // In order to show and make responsive the links that Google adds to every
            // Street View panorama (link to Google maps, terms of use etc.) I have
            // made the threejs container smaller than the streetview panorama, so the 
            // bottom of the panorama is not covered. This works, but creates a problem: if
            // the user drags the panorama from the bottom of the window, the threejs
            // container does not receive the event, so the panorama changes but the 3D model
            // does not. I have to listen to the pano_changed event of the street view
            // panorama to make up for this:            
            google.maps.event.addListener(SVO.streetViewPano, 'pov_changed', streetViewPOVChangeListener);
  

                                
            if (SVO.showing.objects3D) {
                SVO.scene.add(SVO.mesh);
            }
       
            SVO.scene.add(SVO.light);
            SVO.attachEventHandlers(); 
            // Obtain real panorama position (the closest one in Street View to
            // lat,lon and call init to start   
            SVO.realPanoPos(lat,lon, SVO.init); 
        });
    };
  
    SVO.init = function(lat, lon) {
        var i;

        var panoPos = latLon2ThreeMeters(lat, lon, worldOrigin);	
        
        SVO.currentPanorama = {};
        SVO.currentPanorama.position = new THREE.Vector3(panoPos.x, panoPos.y, panoPos.z); 
        SVO.currentPanorama.position.y += SVO.PANO_HEIGHT;
        SVO.currentPanorama.heading = 0;           
        SVO.currentPanorama.pitch = 0;         	
                
        if (SVO.showing.streetView) {
            SVO.cameraParams.focalLength = SVO.streetViewFocalLenght();
            SVO.initStreetView(lat, lon);
        }              
        
        SVO.camera.aspect = SVO.$container.width() / SVO.$container.height();
        SVO.camera.setFocalLength(SVO.cameraParams.focalLength); 
                              
        SVO.camera.position.set(SVO.currentPanorama.position.x, SVO.currentPanorama.position.y, SVO.currentPanorama.position.z);	
                       
        // Changing rotation order is necessary. As rotation is relative to the position
        // of the camera, if it rotates first in the X axis (by default), the Y axis
        // will not be "up" anymore. If I rotate first in the Y axis, rotation in X is
        // not affected so I can rotate in X later.  
        SVO.camera.rotation.order = 'YXZ';
        SVO.camera.rotation.x = SVO.currentPanorama.pitch * SVO.DEG2RAD;
        SVO.camera.rotation.y = -SVO.currentPanorama.heading * SVO.DEG2RAD;
                
        SVO.renderer.setSize(SVO.$container.width(), SVO.$container.height());
        SVO.animate();        
    };
    
    SVO.initStreetView = function(lat, lon) {                    
        var panoPos = new google.maps.LatLng(lat,lon);                
        var myPOV = {heading:SVO.currentPanorama.heading, 
                     pitch:SVO.currentPanorama.pitch, zoom:1};        
        SVO.streetViewPano.setPosition(panoPos);
        SVO.streetViewPano.setPov(myPOV);
    };
    
    SVO.updateStreetView = function() {
        // If I am calling this function, I do not need the streetViewPano
        // to generate events when pov changes
        google.maps.event.clearListeners(SVO.streetViewPano, 'pov_changed');   
                            
        var myPOV = {heading: SVO.currentHeading(), 
                     pitch:SVO.currentPitch(), zoom:SVO.currentStreetViewZoom};                   
        SVO.streetViewPano.setPov(myPOV);
          
        // After updating pov, it can generate pov change events again
        google.maps.event.addListener(SVO.streetViewPano, 'pov_changed', streetViewPOVChangeListener);
    };      
    
    SVO.realPanoPos = function(lat, lon, callBackFun) {                                                                
        var givenPanoPos = new google.maps.LatLng(lat, lon);                

        function processSVData(data, status) {
           if (status === google.maps.StreetViewStatus.OK) {
               callBackFun(data.location.latLng.lat(),
                           data.location.latLng.lng());               
           } else {
               throw new Error("Panorama not found");     
           }          
        }
        var sv = new google.maps.StreetViewService();
        // With a radius of 50 or less, this call returns information
        // about the closest streetview panorama to the given position.
        // In the callback function processSVData, the data
        // parameter can give us the TRUE position of the panorama.
        // This is necessary because the StreetViewPanorama object position
        // is the one we give to it, no the TRUE position of that panorama.
        sv.getPanoramaByLocation(givenPanoPos, 50, processSVData);                                  
    };
    
    // Returns a focal length "compatible" with a Google Street View background
    // given the current size of the renderer and the given zoomLevel
    SVO.streetViewFocalLenght = function(zoomLevel) {
        if (!zoomLevel || zoomLevel < 1) {
            zoomLevel = 1;
        }
        if (SVO.$container.width() > 0) {            
            return (SVO.STREETVIEW_FOCAL_LENGTH_MULTIPLIER * SVO.$container.width() / SVO.$container.height()) 
                   + SVO.STREETVIEW_ZOOM_CONSTANT * (zoomLevel - 1);
            
        } else {
            // Just in case innerHeight is 0. If that happens, it does not matter which
            // focal length we return, because nothing will be shown
            return SVO.DEFAULT_FOCAL_LENGTH;
        }
    };
    

    SVO.currentHeading = function() {
      return -(SVO.camera.rotation.y * SVO.RAD2DEG);    
    };
    
    SVO.currentPitch = function() {
      return SVO.camera.rotation.x * SVO.RAD2DEG;    
    };
    
    
    SVO.attachEventHandlers = function() {    
        function onMouseWheel(event) {
            event.preventDefault();           
            event.stopPropagation();

            // Zooming could be more "progressive", but for now this is enough
            if (event.deltaY > 0) {            
                SVO.currentStreetViewZoom += 1;
                SVO.cameraParams.focalLength = SVO.streetViewFocalLenght(SVO.currentStreetViewZoom);
            } else {
                if (SVO.currentStreetViewZoom > 1) {
                    SVO.currentStreetViewZoom -= 1;
                    SVO.cameraParams.focalLength = SVO.streetViewFocalLenght(SVO.currentStreetViewZoom);
                }
            }            
            
            
            SVO.camera.setFocalLength(SVO.cameraParams.focalLength);
            SVO.camera.updateProjectionMatrix();
            
            SVO.updateStreetView();
            
            SVO.render();
        };  
        
        function onMouseDown(event) {
            event.preventDefault();           
            event.stopPropagation();
                
            SVO.dragView.draggingView = true;

            SVO.dragView.mouseDownX = event.clientX;
            SVO.dragView.mouseDownY = event.clientY;                                               
        };
        
        function onMouseUp(event) {
            event.preventDefault();           
            event.stopPropagation();
            SVO.dragView.draggingView = false;
        };
        
        function onMouseMove(event) {
            event.preventDefault();           
            event.stopPropagation();
            
            var horizontalMovement, verticalMovement;     
            
            var aspect = SVO.$container.width() / SVO.$container.height();
            // horizontal FOV. Formula from <https://github.com/mrdoob/three.js/issues/1239>            
            var hFOV = 2 * Math.atan( Math.tan( (SVO.camera.fov * SVO.DEG2RAD) / 2 ) * aspect );                        
            
            if (SVO.dragView.draggingView) {
                horizontalMovement = SVO.dragView.mouseDownX  - event.clientX;
                verticalMovement  = SVO.dragView.mouseDownY  - event.clientY;
                
                // The /N is to adjust the "responsiveness" of the panning. 
                // This needs a rewriting but for now it works...                
                SVO.camera.rotation.y = (SVO.camera.rotation.y - ((horizontalMovement/4) * hFOV / SVO.$container.width())) % (2 * Math.PI);                
                SVO.camera.rotation.x = SVO.camera.rotation.x + ((verticalMovement/4) *  (SVO.camera.fov * SVO.DEG2RAD) / SVO.$container.height());
                SVO.camera.rotation.x = Math.max(-Math.PI/2, Math.min( Math.PI/2, SVO.camera.rotation.x));                
                
                SVO.updateStreetView();
            }
        };
        
        function onWindowResize() {
            SVO.camera.aspect = SVO.$container.width() / SVO.$container.height();            
            
            if (SVO.showing.streetView) {
              SVO.cameraParams.focalLength = SVO.streetViewFocalLenght();
              SVO.camera.setFocalLength(SVO.cameraParams.focalLength);    
            }                                    
            SVO.camera.updateProjectionMatrix();            
            
            SVO.renderer.setSize(SVO.$container.width(), SVO.$container.height());
        };
        
        function onKeyUp(event) {            
            currShownPano = (currShownPano + 1) % panoramaPos.length; 
            
            switch (event.which) {
                case 13: // return
                case 32: // space         
                    event.preventDefault();
                    event.stopPropagation();
                    // change to the next panorama in panoramaPos
                    SVO.realPanoPos(panoramaPos[currShownPano][0],
                                    panoramaPos[currShownPano][1], SVO.init);                          
                default:
                    // Nothing. It is important not to interfere at all 
                    // with keys I do not use.
            }
        };
      
        SVO.$container.mousewheel(onMouseWheel);
        SVO.$container.mousedown(onMouseDown);
        SVO.$container.mouseup(onMouseUp);
        SVO.$container.mousemove(onMouseMove);
        $(window).resize(onWindowResize);
        $(document).on("keyup", onKeyUp);
        
    };

    SVO.animate = function() {
        requestAnimationFrame(SVO.animate);
        SVO.render();
    };

    SVO.render = function() {        
        SVO.renderer.render(SVO.scene, SVO.camera );
    };
    
    return SVO;
};
