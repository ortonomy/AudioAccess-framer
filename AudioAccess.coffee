# this module requires 'Recorder JS' by Matt Diamond (https://github.com/mattdiamond/Recorderjs)
# you can install this in your Framer prototype by running ``npm install recorderjs`` in the folder for your framer prototype. Make sure you have npm installed first.
# you then need to create an 'npm.coffee' module file and require the recorder js library. This coffescript is provided as part of this module, but you can create your own. See the Framer documentation at https://framerjs.com/docs/#modules.npm

class exports.AudioAccess
    constructor: (audioContext) ->
        #imports
        { Recorder } = require "npm"

        #object variables
        # create the audio context from which we'll generate the audio nodes for audio
        @audioContext ?= new (window.AudioContext || window.webkitAudioContext)

        # create the source stream (microhpone) so we can capture input. THIS ONLY WORKS IN CHROME AS OF 2016-11-18 AND ONLY FROM HTTPS or LOCALHOST. WILL ASK USER FOR PERMISISON, FRAMER THROWS ERROR
        @audioSource = null
        navigator.getUserMedia = navigator.getUserMedia ||
                         navigator.webkitGetUserMedia ||
                         navigator.mozGetUserMedia
        navigator.getUserMedia({audio:true,video:false}, ( (stream) -> @audioSource = @audioContext.createMediaStreamSource(stream) ).bind(@), () -> print "You must run this on https, or localhost for it to work")
        # variable for Recorder object
        @Recorder = null
        # variable for storing the last recorded blob
        @lastRecording = null
        # variable for storing loaded audio file
        @audioBuffer = null
        # state tracking of play setLastRecording
        @isPlaying = false
        # recording buffer filled when playing recording
        @recordBuffer = null

        # create input and processing nodes
        @gain_node = @audioContext.createGain()
        @compressor_node = @audioContext.createDynamicsCompressor()
        @compressor_node.threshold.value = -50
        @compressor_node.knee.value = 40
        @compressor_node.ratio.value = 12
        @compressor_node.reduction.value = -20
        @compressor_node.attack.value = 0
        @compressor_node.release.value = .25
        @gain_node.connect(@compressor_node)

        #create Recorder and supply it with the output source node
        @Recorder = new Recorder(@compressor_node)
        console.log(@Recorder)

        #create playback source node and connect to the output device
        @bufferSource = @audioContext.createBufferSource()
        @bufferSource.connect(@audioContext.destination)

        #create browser independent buffer function
        #@audioContext.createBuffer = @audioContext.createBuffer || @audioContext.webkitCreateBuffer

        #debug
        console.log(@)

    attachLiveInput: () ->
        @audioSource.connect(@gain_node)

    detachLiveInput: () ->
        @audioSource.disconnect(@gain_node)

    setOutputVolume: (value) ->
        @gain_node.gain.value = value

    attachLiveOutput: () ->
        @compressor_node.connect(@audioContext.destination)

    detachLiveOutput: () ->
        @compressor_node.disconnect(@audioContext.destination)

    recordInput: () ->
        @Recorder.clear()
        @Recorder.record()

    stopRecordInput: () ->
        @Recorder.stop()
        @Recorder.exportWAV( ( (blob) -> @storeRecording(blob) ).bind(@) )

    storeRecording: (blob) ->
        @lastRecording = null
        @lastRecording = blob
        @recordingCB()

    playLastRecording: () ->
        if @lastRecording and !@isPlaying
            @recordBuffer = null
            @recordBuffer = @audioContext.createBufferSource()
            filePath = URL.createObjectURL(@lastRecording)
            request = new XMLHttpRequest()
            request.open "GET", filePath, true
            request.responseType = "arraybuffer"
            request.onload = ( (e) -> @processArrayBuffer request.response, @recordBuffer ).bind(@)
            request.send()

    processArrayBuffer: (arrayBuffer, bufferSource) ->
        @audioContext.decodeAudioData(arrayBuffer ,( (buffer) ->
            bufferSource.buffer = buffer
            bufferSource.addEventListener "ended", ( () ->
                @isPlaying = false
                @playRecordingCB() ).bind(@)
            bufferSource.connect(@audioContext.destination)
            bufferSource.start(0)
            @isPlaying = true ).bind(@) )

    stopPlayLastRecording: () ->
        if @isPlaying and @recordBuffer
            @recordBuffer.stop()

    getLastRecording: () ->
        if @lastRecording then return @lastRecording else return undefined

    setLastRecording: (recording) ->
        @lastRecording = recording

    playAudioFile: (callback) ->
        if @audioBuffer and !@isPlaying
            @bufferSource = null
            @bufferSource = @audioContext.createBufferSource()
            @bufferSource.buffer = @audioBuffer
            @bufferSource.addEventListener "ended", ( () ->
                @isPlaying = false
                if callback then callback() ).bind(@)
            @bufferSource.connect(@audioContext.destination)
            @bufferSource.start(0)
            @isPlaying = true

    stopAudioFile: (callback)->
        if @isPlaying and @bufferSource
            @isPlaying = false
            @bufferSource.stop()
            if callback then callback()

    loadAudioFile: (filePath,callback) ->
        request = new XMLHttpRequest()
        request.open "GET", filePath, true
        request.responseType = "arraybuffer"
        request.onload = ( (e) ->
            @decodeAudio(request.response)
            if callback then callback() ).bind(@)
        request.send()

    decodeAudio: (arrayBuffer) ->
        @audioContext.decodeAudioData(arrayBuffer ,( (buffer) ->
            @audioBuffer = buffer ).bind(@) )

    recordingCB: () ->
        return

    playRecordingCB: () ->
        return
