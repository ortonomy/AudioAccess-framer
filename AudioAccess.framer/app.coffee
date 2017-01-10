# Project Info
# This info is presented in a widget when you share.
# http://framerjs.com/docs/#info.info

Framer.Info =
	title: ""
	author: "Gregory Orton"
	twitter: ""
	description: ""


# Module info
# this module requires 'Recorder JS' by Matt Diamond (https://github.com/mattdiamond/Recorderjs)
# you can install this by running ``npm install recorderjs`` in the folder for your framer prototype. Make sure you have npm installed first.
# you then need to create an 'npm.coffee' module file and require the recorder js library. This coffescript is provided as part of this module, but you can create your own. See the Framer documentation at https://framerjs.com/docs/#modules.npm
# REMEMBER THAT THIS MODULE WILL NOT WORK IN ANYTHING OTHER THAN CHROME BROWSER ON THE DEKSTOP AND THAT YOU NEED TO CHANGE YOUR ADDRESS TO 'http://localhost:8000/...' for this to work.

###
Files you need
1. npm.coffee
2. AudioAccess.coffee
3. Everything in the ``node_modules``, including the ``node_modules`` folder
4. The code below

One last warning - you need a little bit of luck when loading this module. For some reason, Framer seems to complain when creating new prototypes if things are put in the folder in a specific order.
1. Put the ``node_modules`` in the Framer directory first
2. Put the ``npm.coffee`` file in the ``modules`` folder. SAVE
3. Put the ``AudioAccess.coffee`` file in the ``modules`` folder. SAVE
4. Add the library import line below. SAVE
5. add the 'new ...' line. SAVE.
6. Igore the error about 'navigator.getUserMedia...' - this is because Framer runs on safari and cannot load the user input.
###


# create button layers
inputon = new Layer
	y: Screen.height / 4 * 0
	width: Screen.width / 2
	height: Screen.height / 4
	x: Screen.width / 2
	backgroundColor: "#333"
	html: "live input on"
	style: 
		"fontSize":"40px"
		"padding-top": "130px"
		"text-align":"center"
		"line-height":"1.2"
	

inputoff = new Layer
	y: Screen.height / 4 * 1
	width: Screen.width / 2
	height: Screen.height / 4
	x: Screen.width / 2
	backgroundColor: "#444"
	html: "live input off"
	style: 
		"fontSize":"40px"
		"padding-top": "130px"
		"text-align":"center"
		"line-height":"1.2"

outputon = new Layer
	y: Screen.height / 4 * 2
	width: Screen.width / 2
	height: Screen.height / 4
	x: Screen.width / 2
	backgroundColor: "#555"
	html: "live output on"
	style: 
		"fontSize":"40px"
		"padding-top": "130px"
		"text-align":"center"
		"line-height":"1.2"

outputoff = new Layer
	y: Screen.height / 4 * 3
	width: Screen.width / 2
	height: Screen.height / 4
	x: Screen.width / 2
	backgroundColor: "#666"
	html: "live output off"
	style: 
		"fontSize":"40px"
		"padding-top": "130px"
		"text-align":"center"
		"line-height":"1.2"

recordStart = new Layer
	y: Screen.height / 4 * 0
	width: Screen.width / 2
	height: Screen.height / 4
	backgroundColor: "#C11"
	html: "live record start"
	style: 
		"fontSize":"40px"
		"padding-top": "130px"
		"text-align":"center"
		"line-height":"1.2"
recordStop = new Layer
	y: Screen.height / 4 * 1
	width: Screen.width / 2
	height: Screen.height / 4
	backgroundColor: "#C31"
	html: "live record stop"
	style: 
		"fontSize":"40px"
		"padding-top": "130px"
		"text-align":"center"
		"line-height":"1.2"
playRecording = new Layer
	y: Screen.height / 4 * 2
	width: Screen.width / 2
	height: Screen.height / 4
	backgroundColor: "#C51"
	html: "play recording"
	style: 
		"fontSize":"40px"
		"padding-top": "130px"
		"text-align":"center"
		"line-height":"1.2"

playSample = new Layer
	y: Screen.height / 4 * 3
	width: Screen.width / 2
	height: Screen.height / 4
	backgroundColor: "#C71"
	html: "play sample audio"
	style: 
		"fontSize":"40px"
		"padding-top": "130px"
		"text-align":"center"
		"line-height":"1"
		
stopRecording = new Layer
	y: Align.center
	x: Align.center
	width: Screen.width / 2
	height: Screen.height / 6
	backgroundColor: "#C71"
	html: "stop  playing recording"
	style: 
		"fontSize":"40px"
		"padding-top": "60px"
		"text-align":"center"
		"line-height": "1.3"

# import the library
{ AudioAccess } = require "AudioAccess"
# create a new object
AudioAccess = new AudioAccess

# bind AudioAccess controls to one of the buttons. Should be obvious!
inputon.on Events.Tap, ->
	AudioAccess.attachLiveInput()
	
inputoff.on Events.Tap, ->
	AudioAccess.detachLiveInput()
	
outputon.on Events.Tap, ->
	AudioAccess.attachLiveOutput()
	
outputoff.on Events.Tap, ->
	AudioAccess.detachLiveOutput()

recordStart.on Events.Tap, ->
	AudioAccess.recordInput()
	
recordStop.on Events.Tap, ->
	AudioAccess.stopRecordInput()

stopRecording.on Events.Tap, ->
	AudioAccess.stopPlayLastRecording()
	

###
# this one below  is a little bit more complicated

Getting a file from the file system is 'asynchronous' meaning the loading and execution of the rest of the program happen in parallel. The way around this is to have a function that is called ``after`` the asynchronous loader has completed. In JS parlance they call this a ``callback``. As you can see in the code below, to play a file loaded, you need to assign the library's own ``playAudioFile`` function to the callback ``userAudiFileCB`` which is called ``after`` the file successfully loads. 

If you want to play a media FILE, then as long as you copy both lines of code, you'll be allright.
### 
		
playSample.on Events.Tap, ->
	AudioAccess.userAudiFileCB = AudioAccess.playAudioFile
	AudioAccess.loadAudioFile("audio/yoga.mp3")
	
# the play recording function has a user callback, which is triggered after the recording finishes. In this case you can assign your own function which I've called ``doSomethingAfterPlaying``. This is useful if you want trigger an animation, or return a play icon to a previous state.
playRecording.on Events.Tap, ->
	AudioAccess.playRecordingCB = doSomethingAfterPlaying
	AudioAccess.playLastRecording()
	

doSomethingAfterPlaying = () ->
	# do something cool here
	print "Finished Playing"
	return
	
