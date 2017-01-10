require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var WORKER_PATH = './recorderWorker.js';

var Recorder = function(source, cfg){
  var config = cfg || {};
  var bufferLen = config.bufferLen || 4096;
  this.context = source.context;
  this.node = (this.context.createScriptProcessor ||
               this.context.createJavaScriptNode).call(this.context,
                                                       bufferLen, 2, 2);
  var worker = new Worker(window.URL.createObjectURL(new Blob(['(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module \'"+o+"\'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){\nvar recLength = 0,\n  recBuffersL = [],\n  recBuffersR = [],\n  sampleRate;\n\n\nself.onmessage = function(e) {\n  switch(e.data.command){\n    case \'init\':\n      init(e.data.config);\n      break;\n    case \'record\':\n      record(e.data.buffer);\n      break;\n    case \'exportWAV\':\n      exportWAV(e.data.type);\n      break;\n    case \'getBuffer\':\n      getBuffer();\n      break;\n    case \'clear\':\n      clear();\n      break;\n  }\n};\n\nfunction init(config){\n  sampleRate = config.sampleRate;\n}\n\nfunction record(inputBuffer){\n  recBuffersL.push(inputBuffer[0]);\n  recBuffersR.push(inputBuffer[1]);\n  recLength += inputBuffer[0].length;\n}\n\nfunction exportWAV(type){\n  var bufferL = mergeBuffers(recBuffersL, recLength);\n  var bufferR = mergeBuffers(recBuffersR, recLength);\n  var interleaved = interleave(bufferL, bufferR);\n  var dataview = encodeWAV(interleaved);\n  var audioBlob = new Blob([dataview], { type: type });\n\n  self.postMessage(audioBlob);\n}\n\nfunction getBuffer() {\n  var buffers = [];\n  buffers.push( mergeBuffers(recBuffersL, recLength) );\n  buffers.push( mergeBuffers(recBuffersR, recLength) );\n  self.postMessage(buffers);\n}\n\nfunction clear(){\n  recLength = 0;\n  recBuffersL = [];\n  recBuffersR = [];\n}\n\nfunction mergeBuffers(recBuffers, recLength){\n  var result = new Float32Array(recLength);\n  var offset = 0;\n  for (var i = 0; i < recBuffers.length; i++){\n    result.set(recBuffers[i], offset);\n    offset += recBuffers[i].length;\n  }\n  return result;\n}\n\nfunction interleave(inputL, inputR){\n  var length = inputL.length + inputR.length;\n  var result = new Float32Array(length);\n\n  var index = 0,\n    inputIndex = 0;\n\n  while (index < length){\n    result[index++] = inputL[inputIndex];\n    result[index++] = inputR[inputIndex];\n    inputIndex++;\n  }\n  return result;\n}\n\nfunction floatTo16BitPCM(output, offset, input){\n  for (var i = 0; i < input.length; i++, offset+=2){\n    var s = Math.max(-1, Math.min(1, input[i]));\n    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);\n  }\n}\n\nfunction writeString(view, offset, string){\n  for (var i = 0; i < string.length; i++){\n    view.setUint8(offset + i, string.charCodeAt(i));\n  }\n}\n\nfunction encodeWAV(samples){\n  var buffer = new ArrayBuffer(44 + samples.length * 2);\n  var view = new DataView(buffer);\n\n  /* RIFF identifier */\n  writeString(view, 0, \'RIFF\');\n  /* RIFF chunk length */\n  view.setUint32(4, 36 + samples.length * 2, true);\n  /* RIFF type */\n  writeString(view, 8, \'WAVE\');\n  /* format chunk identifier */\n  writeString(view, 12, \'fmt \');\n  /* format chunk length */\n  view.setUint32(16, 16, true);\n  /* sample format (raw) */\n  view.setUint16(20, 1, true);\n  /* channel count */\n  view.setUint16(22, 2, true);\n  /* sample rate */\n  view.setUint32(24, sampleRate, true);\n  /* byte rate (sample rate * block align) */\n  view.setUint32(28, sampleRate * 4, true);\n  /* block align (channel count * bytes per sample) */\n  view.setUint16(32, 4, true);\n  /* bits per sample */\n  view.setUint16(34, 16, true);\n  /* data chunk identifier */\n  writeString(view, 36, \'data\');\n  /* data chunk length */\n  view.setUint32(40, samples.length * 2, true);\n\n  floatTo16BitPCM(view, 44, samples);\n\n  return view;\n}\n\n},{}]},{},[1])'],{type:"text/javascript"})));
  worker.onmessage = function(e){
    var blob = e.data;
    currCallback(blob);
  }

  worker.postMessage({
    command: 'init',
    config: {
      sampleRate: this.context.sampleRate
    }
  });
  var recording = false,
    currCallback;

  this.node.onaudioprocess = function(e){
    if (!recording) return;
    worker.postMessage({
      command: 'record',
      buffer: [
        e.inputBuffer.getChannelData(0),
        e.inputBuffer.getChannelData(1)
      ]
    });
  }

  this.configure = function(cfg){
    for (var prop in cfg){
      if (cfg.hasOwnProperty(prop)){
        config[prop] = cfg[prop];
      }
    }
  }

  this.record = function(){
    recording = true;
  }

  this.stop = function(){
    recording = false;
  }

  this.clear = function(){
    worker.postMessage({ command: 'clear' });
  }

  this.getBuffer = function(cb) {
    currCallback = cb || config.callback;
    worker.postMessage({ command: 'getBuffer' })
  }

  this.exportWAV = function(cb, type){
    currCallback = cb || config.callback;
    type = type || config.type || 'audio/wav';
    if (!currCallback) throw new Error('Callback not set');
    worker.postMessage({
      command: 'exportWAV',
      type: type
    });
  }

  source.connect(this.node);
  this.node.connect(this.context.destination);    //this should not be necessary
};

Recorder.forceDownload = function(blob, filename){
  var url = (window.URL || window.webkitURL).createObjectURL(blob);
  var link = window.document.createElement('a');
  link.href = url;
  link.download = filename || 'output.wav';
  var click = document.createEvent("Event");
  click.initEvent("click", true, true);
  link.dispatchEvent(click);
}

module.exports = Recorder;

},{}],"AudioAccess":[function(require,module,exports){
exports.AudioAccess = (function() {
  function AudioAccess(audioContext) {
    var Recorder;
    Recorder = require("npm").Recorder;
    if (this.audioContext == null) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext);
    }
    this.audioSource = null;
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
    navigator.getUserMedia({
      audio: true,
      video: false
    }, (function(stream) {
      return this.audioSource = this.audioContext.createMediaStreamSource(stream);
    }).bind(this), function() {
      return print("You must run this on https, or localhost for it to work");
    });
    this.Recorder = null;
    this.lastRecording = null;
    this.audioBuffer = null;
    this.isPlaying = false;
    this.recordBuffer = null;
    this.gain_node = this.audioContext.createGain();
    this.compressor_node = this.audioContext.createDynamicsCompressor();
    this.compressor_node.threshold.value = -50;
    this.compressor_node.knee.value = 40;
    this.compressor_node.ratio.value = 12;
    this.compressor_node.reduction.value = -20;
    this.compressor_node.attack.value = 0;
    this.compressor_node.release.value = .25;
    this.gain_node.connect(this.compressor_node);
    this.Recorder = new Recorder(this.compressor_node);
    console.log(this.Recorder);
    this.bufferSource = this.audioContext.createBufferSource();
    this.bufferSource.connect(this.audioContext.destination);
    console.log(this);
  }

  AudioAccess.prototype.attachLiveInput = function() {
    return this.audioSource.connect(this.gain_node);
  };

  AudioAccess.prototype.detachLiveInput = function() {
    return this.audioSource.disconnect(this.gain_node);
  };

  AudioAccess.prototype.setOutputVolume = function(value) {
    return this.gain_node.gain.value = value;
  };

  AudioAccess.prototype.attachLiveOutput = function() {
    return this.compressor_node.connect(this.audioContext.destination);
  };

  AudioAccess.prototype.detachLiveOutput = function() {
    return this.compressor_node.disconnect(this.audioContext.destination);
  };

  AudioAccess.prototype.recordInput = function() {
    this.Recorder.clear();
    return this.Recorder.record();
  };

  AudioAccess.prototype.stopRecordInput = function() {
    this.Recorder.stop();
    return this.Recorder.exportWAV((function(blob) {
      return this.storeRecording(blob);
    }).bind(this));
  };

  AudioAccess.prototype.storeRecording = function(blob) {
    this.lastRecording = null;
    this.lastRecording = blob;
    return this.recordingCB();
  };

  AudioAccess.prototype.playLastRecording = function() {
    var filePath, request;
    if (this.lastRecording && !this.isPlaying) {
      this.recordBuffer = null;
      this.recordBuffer = this.audioContext.createBufferSource();
      filePath = URL.createObjectURL(this.lastRecording);
      request = new XMLHttpRequest();
      request.open("GET", filePath, true);
      request.responseType = "arraybuffer";
      request.onload = (function(e) {
        return this.processArrayBuffer(request.response, this.recordBuffer);
      }).bind(this);
      return request.send();
    }
  };

  AudioAccess.prototype.processArrayBuffer = function(arrayBuffer, bufferSource) {
    return this.audioContext.decodeAudioData(arrayBuffer, (function(buffer) {
      bufferSource.buffer = buffer;
      bufferSource.addEventListener("ended", (function() {
        this.isPlaying = false;
        return this.playRecordingCB();
      }).bind(this));
      bufferSource.connect(this.audioContext.destination);
      bufferSource.start(0);
      return this.isPlaying = true;
    }).bind(this));
  };

  AudioAccess.prototype.stopPlayLastRecording = function() {
    if (this.isPlaying && this.recordBuffer) {
      return this.recordBuffer.stop();
    }
  };

  AudioAccess.prototype.getLastRecording = function() {
    if (this.lastRecording) {
      return this.lastRecording;
    } else {
      return void 0;
    }
  };

  AudioAccess.prototype.setLastRecording = function(recording) {
    return this.lastRecording = recording;
  };

  AudioAccess.prototype.playAudioFile = function(callback) {
    if (this.audioBuffer && !this.isPlaying) {
      this.bufferSource = null;
      this.bufferSource = this.audioContext.createBufferSource();
      this.bufferSource.buffer = this.audioBuffer;
      this.bufferSource.addEventListener("ended", (function() {
        this.isPlaying = false;
        if (callback) {
          return callback();
        }
      }).bind(this));
      this.bufferSource.connect(this.audioContext.destination);
      this.bufferSource.start(0);
      return this.isPlaying = true;
    }
  };

  AudioAccess.prototype.stopAudioFile = function(callback) {
    if (this.isPlaying && this.bufferSource) {
      this.isPlaying = false;
      this.bufferSource.stop();
      if (callback) {
        return callback();
      }
    }
  };

  AudioAccess.prototype.loadAudioFile = function(filePath, callback) {
    var request;
    request = new XMLHttpRequest();
    request.open("GET", filePath, true);
    request.responseType = "arraybuffer";
    request.onload = (function(e) {
      this.decodeAudio(request.response);
      if (callback) {
        return callback();
      }
    }).bind(this);
    return request.send();
  };

  AudioAccess.prototype.decodeAudio = function(arrayBuffer) {
    return this.audioContext.decodeAudioData(arrayBuffer, (function(buffer) {
      return this.audioBuffer = buffer;
    }).bind(this));
  };

  AudioAccess.prototype.recordingCB = function() {};

  AudioAccess.prototype.playRecordingCB = function() {};

  return AudioAccess;

})();


},{"npm":"npm"}],"npm":[function(require,module,exports){
exports.Recorder = require("recorderjs");


},{"recorderjs":1}]},{},[])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJhbWVyLm1vZHVsZXMuanMiLCJzb3VyY2VzIjpbIi4uL21vZHVsZXMvbnBtLmNvZmZlZSIsIi4uL21vZHVsZXMvQXVkaW9BY2Nlc3MuY29mZmVlIiwiLi4vLi4vLi4vLi4vLi4vVXNlcnMvZ3JlZ29yeW9ydG9uL0Rldi9zaGFyZWQvcHJvdG90eXBlcy9mcmFtZXIvQXVkaW9BY2Nlc3MuZnJhbWVyL25vZGVfbW9kdWxlcy9yZWNvcmRlcmpzL3JlY29yZGVyLmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIjIG1vZHVsZSBmaWxlOiBucG0uY29mZmVlXG5leHBvcnRzLlJlY29yZGVyID0gcmVxdWlyZSBcInJlY29yZGVyanNcIlxuIiwiIyB0aGlzIG1vZHVsZSByZXF1aXJlcyAnUmVjb3JkZXIgSlMnIGJ5IE1hdHQgRGlhbW9uZCAoaHR0cHM6Ly9naXRodWIuY29tL21hdHRkaWFtb25kL1JlY29yZGVyanMpXG4jIHlvdSBjYW4gaW5zdGFsbCB0aGlzIGluIHlvdXIgRnJhbWVyIHByb3RvdHlwZSBieSBydW5uaW5nIGBgbnBtIGluc3RhbGwgcmVjb3JkZXJqc2BgIGluIHRoZSBmb2xkZXIgZm9yIHlvdXIgZnJhbWVyIHByb3RvdHlwZS4gTWFrZSBzdXJlIHlvdSBoYXZlIG5wbSBpbnN0YWxsZWQgZmlyc3QuXG4jIHlvdSB0aGVuIG5lZWQgdG8gY3JlYXRlIGFuICducG0uY29mZmVlJyBtb2R1bGUgZmlsZSBhbmQgcmVxdWlyZSB0aGUgcmVjb3JkZXIganMgbGlicmFyeS4gVGhpcyBjb2ZmZXNjcmlwdCBpcyBwcm92aWRlZCBhcyBwYXJ0IG9mIHRoaXMgbW9kdWxlLCBidXQgeW91IGNhbiBjcmVhdGUgeW91ciBvd24uIFNlZSB0aGUgRnJhbWVyIGRvY3VtZW50YXRpb24gYXQgaHR0cHM6Ly9mcmFtZXJqcy5jb20vZG9jcy8jbW9kdWxlcy5ucG1cblxuY2xhc3MgZXhwb3J0cy5BdWRpb0FjY2Vzc1xuICAgIGNvbnN0cnVjdG9yOiAoYXVkaW9Db250ZXh0KSAtPlxuICAgICAgICAjaW1wb3J0c1xuICAgICAgICB7IFJlY29yZGVyIH0gPSByZXF1aXJlIFwibnBtXCJcblxuICAgICAgICAjb2JqZWN0IHZhcmlhYmxlc1xuICAgICAgICAjIGNyZWF0ZSB0aGUgYXVkaW8gY29udGV4dCBmcm9tIHdoaWNoIHdlJ2xsIGdlbmVyYXRlIHRoZSBhdWRpbyBub2RlcyBmb3IgYXVkaW9cbiAgICAgICAgQGF1ZGlvQ29udGV4dCA/PSBuZXcgKHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgd2luZG93LndlYmtpdEF1ZGlvQ29udGV4dClcblxuICAgICAgICAjIGNyZWF0ZSB0aGUgc291cmNlIHN0cmVhbSAobWljcm9ocG9uZSkgc28gd2UgY2FuIGNhcHR1cmUgaW5wdXQuIFRISVMgT05MWSBXT1JLUyBJTiBDSFJPTUUgQVMgT0YgMjAxNi0xMS0xOCBBTkQgT05MWSBGUk9NIEhUVFBTIG9yIExPQ0FMSE9TVC4gV0lMTCBBU0sgVVNFUiBGT1IgUEVSTUlTSVNPTiwgRlJBTUVSIFRIUk9XUyBFUlJPUlxuICAgICAgICBAYXVkaW9Tb3VyY2UgPSBudWxsXG4gICAgICAgIG5hdmlnYXRvci5nZXRVc2VyTWVkaWEgPSBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgbmF2aWdhdG9yLndlYmtpdEdldFVzZXJNZWRpYSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgIG5hdmlnYXRvci5tb3pHZXRVc2VyTWVkaWFcbiAgICAgICAgbmF2aWdhdG9yLmdldFVzZXJNZWRpYSh7YXVkaW86dHJ1ZSx2aWRlbzpmYWxzZX0sICggKHN0cmVhbSkgLT4gQGF1ZGlvU291cmNlID0gQGF1ZGlvQ29udGV4dC5jcmVhdGVNZWRpYVN0cmVhbVNvdXJjZShzdHJlYW0pICkuYmluZChAKSwgKCkgLT4gcHJpbnQgXCJZb3UgbXVzdCBydW4gdGhpcyBvbiBodHRwcywgb3IgbG9jYWxob3N0IGZvciBpdCB0byB3b3JrXCIpXG4gICAgICAgICMgdmFyaWFibGUgZm9yIFJlY29yZGVyIG9iamVjdFxuICAgICAgICBAUmVjb3JkZXIgPSBudWxsXG4gICAgICAgICMgdmFyaWFibGUgZm9yIHN0b3JpbmcgdGhlIGxhc3QgcmVjb3JkZWQgYmxvYlxuICAgICAgICBAbGFzdFJlY29yZGluZyA9IG51bGxcbiAgICAgICAgIyB2YXJpYWJsZSBmb3Igc3RvcmluZyBsb2FkZWQgYXVkaW8gZmlsZVxuICAgICAgICBAYXVkaW9CdWZmZXIgPSBudWxsXG4gICAgICAgICMgc3RhdGUgdHJhY2tpbmcgb2YgcGxheSBzZXRMYXN0UmVjb3JkaW5nXG4gICAgICAgIEBpc1BsYXlpbmcgPSBmYWxzZVxuICAgICAgICAjIHJlY29yZGluZyBidWZmZXIgZmlsbGVkIHdoZW4gcGxheWluZyByZWNvcmRpbmdcbiAgICAgICAgQHJlY29yZEJ1ZmZlciA9IG51bGxcblxuICAgICAgICAjIGNyZWF0ZSBpbnB1dCBhbmQgcHJvY2Vzc2luZyBub2Rlc1xuICAgICAgICBAZ2Fpbl9ub2RlID0gQGF1ZGlvQ29udGV4dC5jcmVhdGVHYWluKClcbiAgICAgICAgQGNvbXByZXNzb3Jfbm9kZSA9IEBhdWRpb0NvbnRleHQuY3JlYXRlRHluYW1pY3NDb21wcmVzc29yKClcbiAgICAgICAgQGNvbXByZXNzb3Jfbm9kZS50aHJlc2hvbGQudmFsdWUgPSAtNTBcbiAgICAgICAgQGNvbXByZXNzb3Jfbm9kZS5rbmVlLnZhbHVlID0gNDBcbiAgICAgICAgQGNvbXByZXNzb3Jfbm9kZS5yYXRpby52YWx1ZSA9IDEyXG4gICAgICAgIEBjb21wcmVzc29yX25vZGUucmVkdWN0aW9uLnZhbHVlID0gLTIwXG4gICAgICAgIEBjb21wcmVzc29yX25vZGUuYXR0YWNrLnZhbHVlID0gMFxuICAgICAgICBAY29tcHJlc3Nvcl9ub2RlLnJlbGVhc2UudmFsdWUgPSAuMjVcbiAgICAgICAgQGdhaW5fbm9kZS5jb25uZWN0KEBjb21wcmVzc29yX25vZGUpXG5cbiAgICAgICAgI2NyZWF0ZSBSZWNvcmRlciBhbmQgc3VwcGx5IGl0IHdpdGggdGhlIG91dHB1dCBzb3VyY2Ugbm9kZVxuICAgICAgICBAUmVjb3JkZXIgPSBuZXcgUmVjb3JkZXIoQGNvbXByZXNzb3Jfbm9kZSlcbiAgICAgICAgY29uc29sZS5sb2coQFJlY29yZGVyKVxuXG4gICAgICAgICNjcmVhdGUgcGxheWJhY2sgc291cmNlIG5vZGUgYW5kIGNvbm5lY3QgdG8gdGhlIG91dHB1dCBkZXZpY2VcbiAgICAgICAgQGJ1ZmZlclNvdXJjZSA9IEBhdWRpb0NvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKClcbiAgICAgICAgQGJ1ZmZlclNvdXJjZS5jb25uZWN0KEBhdWRpb0NvbnRleHQuZGVzdGluYXRpb24pXG5cbiAgICAgICAgI2NyZWF0ZSBicm93c2VyIGluZGVwZW5kZW50IGJ1ZmZlciBmdW5jdGlvblxuICAgICAgICAjQGF1ZGlvQ29udGV4dC5jcmVhdGVCdWZmZXIgPSBAYXVkaW9Db250ZXh0LmNyZWF0ZUJ1ZmZlciB8fCBAYXVkaW9Db250ZXh0LndlYmtpdENyZWF0ZUJ1ZmZlclxuXG4gICAgICAgICNkZWJ1Z1xuICAgICAgICBjb25zb2xlLmxvZyhAKVxuXG4gICAgYXR0YWNoTGl2ZUlucHV0OiAoKSAtPlxuICAgICAgICBAYXVkaW9Tb3VyY2UuY29ubmVjdChAZ2Fpbl9ub2RlKVxuXG4gICAgZGV0YWNoTGl2ZUlucHV0OiAoKSAtPlxuICAgICAgICBAYXVkaW9Tb3VyY2UuZGlzY29ubmVjdChAZ2Fpbl9ub2RlKVxuXG4gICAgc2V0T3V0cHV0Vm9sdW1lOiAodmFsdWUpIC0+XG4gICAgICAgIEBnYWluX25vZGUuZ2Fpbi52YWx1ZSA9IHZhbHVlXG5cbiAgICBhdHRhY2hMaXZlT3V0cHV0OiAoKSAtPlxuICAgICAgICBAY29tcHJlc3Nvcl9ub2RlLmNvbm5lY3QoQGF1ZGlvQ29udGV4dC5kZXN0aW5hdGlvbilcblxuICAgIGRldGFjaExpdmVPdXRwdXQ6ICgpIC0+XG4gICAgICAgIEBjb21wcmVzc29yX25vZGUuZGlzY29ubmVjdChAYXVkaW9Db250ZXh0LmRlc3RpbmF0aW9uKVxuXG4gICAgcmVjb3JkSW5wdXQ6ICgpIC0+XG4gICAgICAgIEBSZWNvcmRlci5jbGVhcigpXG4gICAgICAgIEBSZWNvcmRlci5yZWNvcmQoKVxuXG4gICAgc3RvcFJlY29yZElucHV0OiAoKSAtPlxuICAgICAgICBAUmVjb3JkZXIuc3RvcCgpXG4gICAgICAgIEBSZWNvcmRlci5leHBvcnRXQVYoICggKGJsb2IpIC0+IEBzdG9yZVJlY29yZGluZyhibG9iKSApLmJpbmQoQCkgKVxuXG4gICAgc3RvcmVSZWNvcmRpbmc6IChibG9iKSAtPlxuICAgICAgICBAbGFzdFJlY29yZGluZyA9IG51bGxcbiAgICAgICAgQGxhc3RSZWNvcmRpbmcgPSBibG9iXG4gICAgICAgIEByZWNvcmRpbmdDQigpXG5cbiAgICBwbGF5TGFzdFJlY29yZGluZzogKCkgLT5cbiAgICAgICAgaWYgQGxhc3RSZWNvcmRpbmcgYW5kICFAaXNQbGF5aW5nXG4gICAgICAgICAgICBAcmVjb3JkQnVmZmVyID0gbnVsbFxuICAgICAgICAgICAgQHJlY29yZEJ1ZmZlciA9IEBhdWRpb0NvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKClcbiAgICAgICAgICAgIGZpbGVQYXRoID0gVVJMLmNyZWF0ZU9iamVjdFVSTChAbGFzdFJlY29yZGluZylcbiAgICAgICAgICAgIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKVxuICAgICAgICAgICAgcmVxdWVzdC5vcGVuIFwiR0VUXCIsIGZpbGVQYXRoLCB0cnVlXG4gICAgICAgICAgICByZXF1ZXN0LnJlc3BvbnNlVHlwZSA9IFwiYXJyYXlidWZmZXJcIlxuICAgICAgICAgICAgcmVxdWVzdC5vbmxvYWQgPSAoIChlKSAtPiBAcHJvY2Vzc0FycmF5QnVmZmVyIHJlcXVlc3QucmVzcG9uc2UsIEByZWNvcmRCdWZmZXIgKS5iaW5kKEApXG4gICAgICAgICAgICByZXF1ZXN0LnNlbmQoKVxuXG4gICAgcHJvY2Vzc0FycmF5QnVmZmVyOiAoYXJyYXlCdWZmZXIsIGJ1ZmZlclNvdXJjZSkgLT5cbiAgICAgICAgQGF1ZGlvQ29udGV4dC5kZWNvZGVBdWRpb0RhdGEoYXJyYXlCdWZmZXIgLCggKGJ1ZmZlcikgLT5cbiAgICAgICAgICAgIGJ1ZmZlclNvdXJjZS5idWZmZXIgPSBidWZmZXJcbiAgICAgICAgICAgIGJ1ZmZlclNvdXJjZS5hZGRFdmVudExpc3RlbmVyIFwiZW5kZWRcIiwgKCAoKSAtPlxuICAgICAgICAgICAgICAgIEBpc1BsYXlpbmcgPSBmYWxzZVxuICAgICAgICAgICAgICAgIEBwbGF5UmVjb3JkaW5nQ0IoKSApLmJpbmQoQClcbiAgICAgICAgICAgIGJ1ZmZlclNvdXJjZS5jb25uZWN0KEBhdWRpb0NvbnRleHQuZGVzdGluYXRpb24pXG4gICAgICAgICAgICBidWZmZXJTb3VyY2Uuc3RhcnQoMClcbiAgICAgICAgICAgIEBpc1BsYXlpbmcgPSB0cnVlICkuYmluZChAKSApXG5cbiAgICBzdG9wUGxheUxhc3RSZWNvcmRpbmc6ICgpIC0+XG4gICAgICAgIGlmIEBpc1BsYXlpbmcgYW5kIEByZWNvcmRCdWZmZXJcbiAgICAgICAgICAgIEByZWNvcmRCdWZmZXIuc3RvcCgpXG5cbiAgICBnZXRMYXN0UmVjb3JkaW5nOiAoKSAtPlxuICAgICAgICBpZiBAbGFzdFJlY29yZGluZyB0aGVuIHJldHVybiBAbGFzdFJlY29yZGluZyBlbHNlIHJldHVybiB1bmRlZmluZWRcblxuICAgIHNldExhc3RSZWNvcmRpbmc6IChyZWNvcmRpbmcpIC0+XG4gICAgICAgIEBsYXN0UmVjb3JkaW5nID0gcmVjb3JkaW5nXG5cbiAgICBwbGF5QXVkaW9GaWxlOiAoY2FsbGJhY2spIC0+XG4gICAgICAgIGlmIEBhdWRpb0J1ZmZlciBhbmQgIUBpc1BsYXlpbmdcbiAgICAgICAgICAgIEBidWZmZXJTb3VyY2UgPSBudWxsXG4gICAgICAgICAgICBAYnVmZmVyU291cmNlID0gQGF1ZGlvQ29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKVxuICAgICAgICAgICAgQGJ1ZmZlclNvdXJjZS5idWZmZXIgPSBAYXVkaW9CdWZmZXJcbiAgICAgICAgICAgIEBidWZmZXJTb3VyY2UuYWRkRXZlbnRMaXN0ZW5lciBcImVuZGVkXCIsICggKCkgLT5cbiAgICAgICAgICAgICAgICBAaXNQbGF5aW5nID0gZmFsc2VcbiAgICAgICAgICAgICAgICBpZiBjYWxsYmFjayB0aGVuIGNhbGxiYWNrKCkgKS5iaW5kKEApXG4gICAgICAgICAgICBAYnVmZmVyU291cmNlLmNvbm5lY3QoQGF1ZGlvQ29udGV4dC5kZXN0aW5hdGlvbilcbiAgICAgICAgICAgIEBidWZmZXJTb3VyY2Uuc3RhcnQoMClcbiAgICAgICAgICAgIEBpc1BsYXlpbmcgPSB0cnVlXG5cbiAgICBzdG9wQXVkaW9GaWxlOiAoY2FsbGJhY2spLT5cbiAgICAgICAgaWYgQGlzUGxheWluZyBhbmQgQGJ1ZmZlclNvdXJjZVxuICAgICAgICAgICAgQGlzUGxheWluZyA9IGZhbHNlXG4gICAgICAgICAgICBAYnVmZmVyU291cmNlLnN0b3AoKVxuICAgICAgICAgICAgaWYgY2FsbGJhY2sgdGhlbiBjYWxsYmFjaygpXG5cbiAgICBsb2FkQXVkaW9GaWxlOiAoZmlsZVBhdGgsY2FsbGJhY2spIC0+XG4gICAgICAgIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKVxuICAgICAgICByZXF1ZXN0Lm9wZW4gXCJHRVRcIiwgZmlsZVBhdGgsIHRydWVcbiAgICAgICAgcmVxdWVzdC5yZXNwb25zZVR5cGUgPSBcImFycmF5YnVmZmVyXCJcbiAgICAgICAgcmVxdWVzdC5vbmxvYWQgPSAoIChlKSAtPlxuICAgICAgICAgICAgQGRlY29kZUF1ZGlvKHJlcXVlc3QucmVzcG9uc2UpXG4gICAgICAgICAgICBpZiBjYWxsYmFjayB0aGVuIGNhbGxiYWNrKCkgKS5iaW5kKEApXG4gICAgICAgIHJlcXVlc3Quc2VuZCgpXG5cbiAgICBkZWNvZGVBdWRpbzogKGFycmF5QnVmZmVyKSAtPlxuICAgICAgICBAYXVkaW9Db250ZXh0LmRlY29kZUF1ZGlvRGF0YShhcnJheUJ1ZmZlciAsKCAoYnVmZmVyKSAtPlxuICAgICAgICAgICAgQGF1ZGlvQnVmZmVyID0gYnVmZmVyICkuYmluZChAKSApXG5cbiAgICByZWNvcmRpbmdDQjogKCkgLT5cbiAgICAgICAgcmV0dXJuXG5cbiAgICBwbGF5UmVjb3JkaW5nQ0I6ICgpIC0+XG4gICAgICAgIHJldHVyblxuIiwidmFyIFdPUktFUl9QQVRIID0gJy4vcmVjb3JkZXJXb3JrZXIuanMnO1xuXG52YXIgUmVjb3JkZXIgPSBmdW5jdGlvbihzb3VyY2UsIGNmZyl7XG4gIHZhciBjb25maWcgPSBjZmcgfHwge307XG4gIHZhciBidWZmZXJMZW4gPSBjb25maWcuYnVmZmVyTGVuIHx8IDQwOTY7XG4gIHRoaXMuY29udGV4dCA9IHNvdXJjZS5jb250ZXh0O1xuICB0aGlzLm5vZGUgPSAodGhpcy5jb250ZXh0LmNyZWF0ZVNjcmlwdFByb2Nlc3NvciB8fFxuICAgICAgICAgICAgICAgdGhpcy5jb250ZXh0LmNyZWF0ZUphdmFTY3JpcHROb2RlKS5jYWxsKHRoaXMuY29udGV4dCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWZmZXJMZW4sIDIsIDIpO1xuICB2YXIgd29ya2VyID0gbmV3IFdvcmtlcih3aW5kb3cuVVJMLmNyZWF0ZU9iamVjdFVSTChuZXcgQmxvYihbJyhmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlIFxcJ1wiK28rXCJcXCdcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSh7MTpbZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7XFxudmFyIHJlY0xlbmd0aCA9IDAsXFxuICByZWNCdWZmZXJzTCA9IFtdLFxcbiAgcmVjQnVmZmVyc1IgPSBbXSxcXG4gIHNhbXBsZVJhdGU7XFxuXFxuXFxuc2VsZi5vbm1lc3NhZ2UgPSBmdW5jdGlvbihlKSB7XFxuICBzd2l0Y2goZS5kYXRhLmNvbW1hbmQpe1xcbiAgICBjYXNlIFxcJ2luaXRcXCc6XFxuICAgICAgaW5pdChlLmRhdGEuY29uZmlnKTtcXG4gICAgICBicmVhaztcXG4gICAgY2FzZSBcXCdyZWNvcmRcXCc6XFxuICAgICAgcmVjb3JkKGUuZGF0YS5idWZmZXIpO1xcbiAgICAgIGJyZWFrO1xcbiAgICBjYXNlIFxcJ2V4cG9ydFdBVlxcJzpcXG4gICAgICBleHBvcnRXQVYoZS5kYXRhLnR5cGUpO1xcbiAgICAgIGJyZWFrO1xcbiAgICBjYXNlIFxcJ2dldEJ1ZmZlclxcJzpcXG4gICAgICBnZXRCdWZmZXIoKTtcXG4gICAgICBicmVhaztcXG4gICAgY2FzZSBcXCdjbGVhclxcJzpcXG4gICAgICBjbGVhcigpO1xcbiAgICAgIGJyZWFrO1xcbiAgfVxcbn07XFxuXFxuZnVuY3Rpb24gaW5pdChjb25maWcpe1xcbiAgc2FtcGxlUmF0ZSA9IGNvbmZpZy5zYW1wbGVSYXRlO1xcbn1cXG5cXG5mdW5jdGlvbiByZWNvcmQoaW5wdXRCdWZmZXIpe1xcbiAgcmVjQnVmZmVyc0wucHVzaChpbnB1dEJ1ZmZlclswXSk7XFxuICByZWNCdWZmZXJzUi5wdXNoKGlucHV0QnVmZmVyWzFdKTtcXG4gIHJlY0xlbmd0aCArPSBpbnB1dEJ1ZmZlclswXS5sZW5ndGg7XFxufVxcblxcbmZ1bmN0aW9uIGV4cG9ydFdBVih0eXBlKXtcXG4gIHZhciBidWZmZXJMID0gbWVyZ2VCdWZmZXJzKHJlY0J1ZmZlcnNMLCByZWNMZW5ndGgpO1xcbiAgdmFyIGJ1ZmZlclIgPSBtZXJnZUJ1ZmZlcnMocmVjQnVmZmVyc1IsIHJlY0xlbmd0aCk7XFxuICB2YXIgaW50ZXJsZWF2ZWQgPSBpbnRlcmxlYXZlKGJ1ZmZlckwsIGJ1ZmZlclIpO1xcbiAgdmFyIGRhdGF2aWV3ID0gZW5jb2RlV0FWKGludGVybGVhdmVkKTtcXG4gIHZhciBhdWRpb0Jsb2IgPSBuZXcgQmxvYihbZGF0YXZpZXddLCB7IHR5cGU6IHR5cGUgfSk7XFxuXFxuICBzZWxmLnBvc3RNZXNzYWdlKGF1ZGlvQmxvYik7XFxufVxcblxcbmZ1bmN0aW9uIGdldEJ1ZmZlcigpIHtcXG4gIHZhciBidWZmZXJzID0gW107XFxuICBidWZmZXJzLnB1c2goIG1lcmdlQnVmZmVycyhyZWNCdWZmZXJzTCwgcmVjTGVuZ3RoKSApO1xcbiAgYnVmZmVycy5wdXNoKCBtZXJnZUJ1ZmZlcnMocmVjQnVmZmVyc1IsIHJlY0xlbmd0aCkgKTtcXG4gIHNlbGYucG9zdE1lc3NhZ2UoYnVmZmVycyk7XFxufVxcblxcbmZ1bmN0aW9uIGNsZWFyKCl7XFxuICByZWNMZW5ndGggPSAwO1xcbiAgcmVjQnVmZmVyc0wgPSBbXTtcXG4gIHJlY0J1ZmZlcnNSID0gW107XFxufVxcblxcbmZ1bmN0aW9uIG1lcmdlQnVmZmVycyhyZWNCdWZmZXJzLCByZWNMZW5ndGgpe1xcbiAgdmFyIHJlc3VsdCA9IG5ldyBGbG9hdDMyQXJyYXkocmVjTGVuZ3RoKTtcXG4gIHZhciBvZmZzZXQgPSAwO1xcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCByZWNCdWZmZXJzLmxlbmd0aDsgaSsrKXtcXG4gICAgcmVzdWx0LnNldChyZWNCdWZmZXJzW2ldLCBvZmZzZXQpO1xcbiAgICBvZmZzZXQgKz0gcmVjQnVmZmVyc1tpXS5sZW5ndGg7XFxuICB9XFxuICByZXR1cm4gcmVzdWx0O1xcbn1cXG5cXG5mdW5jdGlvbiBpbnRlcmxlYXZlKGlucHV0TCwgaW5wdXRSKXtcXG4gIHZhciBsZW5ndGggPSBpbnB1dEwubGVuZ3RoICsgaW5wdXRSLmxlbmd0aDtcXG4gIHZhciByZXN1bHQgPSBuZXcgRmxvYXQzMkFycmF5KGxlbmd0aCk7XFxuXFxuICB2YXIgaW5kZXggPSAwLFxcbiAgICBpbnB1dEluZGV4ID0gMDtcXG5cXG4gIHdoaWxlIChpbmRleCA8IGxlbmd0aCl7XFxuICAgIHJlc3VsdFtpbmRleCsrXSA9IGlucHV0TFtpbnB1dEluZGV4XTtcXG4gICAgcmVzdWx0W2luZGV4KytdID0gaW5wdXRSW2lucHV0SW5kZXhdO1xcbiAgICBpbnB1dEluZGV4Kys7XFxuICB9XFxuICByZXR1cm4gcmVzdWx0O1xcbn1cXG5cXG5mdW5jdGlvbiBmbG9hdFRvMTZCaXRQQ00ob3V0cHV0LCBvZmZzZXQsIGlucHV0KXtcXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgaW5wdXQubGVuZ3RoOyBpKyssIG9mZnNldCs9Mil7XFxuICAgIHZhciBzID0gTWF0aC5tYXgoLTEsIE1hdGgubWluKDEsIGlucHV0W2ldKSk7XFxuICAgIG91dHB1dC5zZXRJbnQxNihvZmZzZXQsIHMgPCAwID8gcyAqIDB4ODAwMCA6IHMgKiAweDdGRkYsIHRydWUpO1xcbiAgfVxcbn1cXG5cXG5mdW5jdGlvbiB3cml0ZVN0cmluZyh2aWV3LCBvZmZzZXQsIHN0cmluZyl7XFxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0cmluZy5sZW5ndGg7IGkrKyl7XFxuICAgIHZpZXcuc2V0VWludDgob2Zmc2V0ICsgaSwgc3RyaW5nLmNoYXJDb2RlQXQoaSkpO1xcbiAgfVxcbn1cXG5cXG5mdW5jdGlvbiBlbmNvZGVXQVYoc2FtcGxlcyl7XFxuICB2YXIgYnVmZmVyID0gbmV3IEFycmF5QnVmZmVyKDQ0ICsgc2FtcGxlcy5sZW5ndGggKiAyKTtcXG4gIHZhciB2aWV3ID0gbmV3IERhdGFWaWV3KGJ1ZmZlcik7XFxuXFxuICAvKiBSSUZGIGlkZW50aWZpZXIgKi9cXG4gIHdyaXRlU3RyaW5nKHZpZXcsIDAsIFxcJ1JJRkZcXCcpO1xcbiAgLyogUklGRiBjaHVuayBsZW5ndGggKi9cXG4gIHZpZXcuc2V0VWludDMyKDQsIDM2ICsgc2FtcGxlcy5sZW5ndGggKiAyLCB0cnVlKTtcXG4gIC8qIFJJRkYgdHlwZSAqL1xcbiAgd3JpdGVTdHJpbmcodmlldywgOCwgXFwnV0FWRVxcJyk7XFxuICAvKiBmb3JtYXQgY2h1bmsgaWRlbnRpZmllciAqL1xcbiAgd3JpdGVTdHJpbmcodmlldywgMTIsIFxcJ2ZtdCBcXCcpO1xcbiAgLyogZm9ybWF0IGNodW5rIGxlbmd0aCAqL1xcbiAgdmlldy5zZXRVaW50MzIoMTYsIDE2LCB0cnVlKTtcXG4gIC8qIHNhbXBsZSBmb3JtYXQgKHJhdykgKi9cXG4gIHZpZXcuc2V0VWludDE2KDIwLCAxLCB0cnVlKTtcXG4gIC8qIGNoYW5uZWwgY291bnQgKi9cXG4gIHZpZXcuc2V0VWludDE2KDIyLCAyLCB0cnVlKTtcXG4gIC8qIHNhbXBsZSByYXRlICovXFxuICB2aWV3LnNldFVpbnQzMigyNCwgc2FtcGxlUmF0ZSwgdHJ1ZSk7XFxuICAvKiBieXRlIHJhdGUgKHNhbXBsZSByYXRlICogYmxvY2sgYWxpZ24pICovXFxuICB2aWV3LnNldFVpbnQzMigyOCwgc2FtcGxlUmF0ZSAqIDQsIHRydWUpO1xcbiAgLyogYmxvY2sgYWxpZ24gKGNoYW5uZWwgY291bnQgKiBieXRlcyBwZXIgc2FtcGxlKSAqL1xcbiAgdmlldy5zZXRVaW50MTYoMzIsIDQsIHRydWUpO1xcbiAgLyogYml0cyBwZXIgc2FtcGxlICovXFxuICB2aWV3LnNldFVpbnQxNigzNCwgMTYsIHRydWUpO1xcbiAgLyogZGF0YSBjaHVuayBpZGVudGlmaWVyICovXFxuICB3cml0ZVN0cmluZyh2aWV3LCAzNiwgXFwnZGF0YVxcJyk7XFxuICAvKiBkYXRhIGNodW5rIGxlbmd0aCAqL1xcbiAgdmlldy5zZXRVaW50MzIoNDAsIHNhbXBsZXMubGVuZ3RoICogMiwgdHJ1ZSk7XFxuXFxuICBmbG9hdFRvMTZCaXRQQ00odmlldywgNDQsIHNhbXBsZXMpO1xcblxcbiAgcmV0dXJuIHZpZXc7XFxufVxcblxcbn0se31dfSx7fSxbMV0pJ10se3R5cGU6XCJ0ZXh0L2phdmFzY3JpcHRcIn0pKSk7XG4gIHdvcmtlci5vbm1lc3NhZ2UgPSBmdW5jdGlvbihlKXtcbiAgICB2YXIgYmxvYiA9IGUuZGF0YTtcbiAgICBjdXJyQ2FsbGJhY2soYmxvYik7XG4gIH1cblxuICB3b3JrZXIucG9zdE1lc3NhZ2Uoe1xuICAgIGNvbW1hbmQ6ICdpbml0JyxcbiAgICBjb25maWc6IHtcbiAgICAgIHNhbXBsZVJhdGU6IHRoaXMuY29udGV4dC5zYW1wbGVSYXRlXG4gICAgfVxuICB9KTtcbiAgdmFyIHJlY29yZGluZyA9IGZhbHNlLFxuICAgIGN1cnJDYWxsYmFjaztcblxuICB0aGlzLm5vZGUub25hdWRpb3Byb2Nlc3MgPSBmdW5jdGlvbihlKXtcbiAgICBpZiAoIXJlY29yZGluZykgcmV0dXJuO1xuICAgIHdvcmtlci5wb3N0TWVzc2FnZSh7XG4gICAgICBjb21tYW5kOiAncmVjb3JkJyxcbiAgICAgIGJ1ZmZlcjogW1xuICAgICAgICBlLmlucHV0QnVmZmVyLmdldENoYW5uZWxEYXRhKDApLFxuICAgICAgICBlLmlucHV0QnVmZmVyLmdldENoYW5uZWxEYXRhKDEpXG4gICAgICBdXG4gICAgfSk7XG4gIH1cblxuICB0aGlzLmNvbmZpZ3VyZSA9IGZ1bmN0aW9uKGNmZyl7XG4gICAgZm9yICh2YXIgcHJvcCBpbiBjZmcpe1xuICAgICAgaWYgKGNmZy5oYXNPd25Qcm9wZXJ0eShwcm9wKSl7XG4gICAgICAgIGNvbmZpZ1twcm9wXSA9IGNmZ1twcm9wXTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICB0aGlzLnJlY29yZCA9IGZ1bmN0aW9uKCl7XG4gICAgcmVjb3JkaW5nID0gdHJ1ZTtcbiAgfVxuXG4gIHRoaXMuc3RvcCA9IGZ1bmN0aW9uKCl7XG4gICAgcmVjb3JkaW5nID0gZmFsc2U7XG4gIH1cblxuICB0aGlzLmNsZWFyID0gZnVuY3Rpb24oKXtcbiAgICB3b3JrZXIucG9zdE1lc3NhZ2UoeyBjb21tYW5kOiAnY2xlYXInIH0pO1xuICB9XG5cbiAgdGhpcy5nZXRCdWZmZXIgPSBmdW5jdGlvbihjYikge1xuICAgIGN1cnJDYWxsYmFjayA9IGNiIHx8IGNvbmZpZy5jYWxsYmFjaztcbiAgICB3b3JrZXIucG9zdE1lc3NhZ2UoeyBjb21tYW5kOiAnZ2V0QnVmZmVyJyB9KVxuICB9XG5cbiAgdGhpcy5leHBvcnRXQVYgPSBmdW5jdGlvbihjYiwgdHlwZSl7XG4gICAgY3VyckNhbGxiYWNrID0gY2IgfHwgY29uZmlnLmNhbGxiYWNrO1xuICAgIHR5cGUgPSB0eXBlIHx8IGNvbmZpZy50eXBlIHx8ICdhdWRpby93YXYnO1xuICAgIGlmICghY3VyckNhbGxiYWNrKSB0aHJvdyBuZXcgRXJyb3IoJ0NhbGxiYWNrIG5vdCBzZXQnKTtcbiAgICB3b3JrZXIucG9zdE1lc3NhZ2Uoe1xuICAgICAgY29tbWFuZDogJ2V4cG9ydFdBVicsXG4gICAgICB0eXBlOiB0eXBlXG4gICAgfSk7XG4gIH1cblxuICBzb3VyY2UuY29ubmVjdCh0aGlzLm5vZGUpO1xuICB0aGlzLm5vZGUuY29ubmVjdCh0aGlzLmNvbnRleHQuZGVzdGluYXRpb24pOyAgICAvL3RoaXMgc2hvdWxkIG5vdCBiZSBuZWNlc3Nhcnlcbn07XG5cblJlY29yZGVyLmZvcmNlRG93bmxvYWQgPSBmdW5jdGlvbihibG9iLCBmaWxlbmFtZSl7XG4gIHZhciB1cmwgPSAod2luZG93LlVSTCB8fCB3aW5kb3cud2Via2l0VVJMKS5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG4gIHZhciBsaW5rID0gd2luZG93LmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgbGluay5ocmVmID0gdXJsO1xuICBsaW5rLmRvd25sb2FkID0gZmlsZW5hbWUgfHwgJ291dHB1dC53YXYnO1xuICB2YXIgY2xpY2sgPSBkb2N1bWVudC5jcmVhdGVFdmVudChcIkV2ZW50XCIpO1xuICBjbGljay5pbml0RXZlbnQoXCJjbGlja1wiLCB0cnVlLCB0cnVlKTtcbiAgbGluay5kaXNwYXRjaEV2ZW50KGNsaWNrKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBSZWNvcmRlcjtcbiIsIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBR0FBO0FEQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QURqRk07QUFDTjtBQUVRO0FBQVI7O0FBSUE7O0FBR0E7QUFDQTtBQUdBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFFQTtBQUVBO0FBRUE7QUFFQTtBQUVBO0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBR0E7QUFDQTtBQUdBO0FBQ0E7QUFNQTtBQWhEQTs7QUFrREE7QUFDQTtBQURBOztBQUdBO0FBQ0E7QUFEQTs7QUFHQTtBQUNBO0FBREE7O0FBR0E7QUFDQTtBQURBOztBQUdBO0FBQ0E7QUFEQTs7QUFHQTtBQUNBO0FBQ0E7QUFGQTs7QUFJQTtBQUNBO0FBQ0E7QUFBQTtBQUFBO0FBRkE7O0FBSUE7QUFDQTtBQUNBO0FBQ0E7QUFIQTs7QUFLQTtBQUNRO0FBQVI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUFBO0FBQUE7QUFDQTs7QUFUQTs7QUFXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFGQTtBQUdBO0FBQ0E7QUFDQTtBQVBBO0FBREE7O0FBVUE7QUFDQTtBQUNBOztBQUZBOztBQUlBO0FBQ0E7QUFBK0I7QUFBL0I7QUFBMEQ7O0FBRDFEOztBQUdBO0FBQ0E7QUFEQTs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQUE7O0FBRkE7QUFHQTtBQUNBO0FBQ0E7O0FBVkE7O0FBWUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUFBO0FBSEE7O0FBREE7O0FBTUE7QUFDUTtBQUFSO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUFBOztBQUZBO0FBR0E7QUFQQTs7QUFTQTtBQUNBO0FBQ0E7QUFEQTtBQURBOztBQUlBOztBQUdBOzs7Ozs7OztBRG5KQTs7OyJ9
