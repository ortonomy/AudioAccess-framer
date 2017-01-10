# AudioAccess-framer
A module for FramerJS that enables microphone input and recording inside Framer prototypes.

# Technology acknowledgements
This module simply exposes and abstracts two technologies to your framer prototypes in a greatly simplified way. These two technologies are:
- __RecorderJS by Matt Diamond__ [https://github.com/mattdiamond/Recorderjs](https://github.com/mattdiamond/Recorderjs)
- __Web Audio API__ this is a new HTML5 API that can be used to load and play audio files, or generate sounds using oscillators and other cool audio tools. See [https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) for details

# Before you use
__Platform support__
As of _10th January 2017_, Framer Studio for macOS uses Safari as its rendering engine. Safari on all platforms does not support the HTML5 API ``getUserMedia``. Given this, this module will cause an error inside Framer Studio related to ``getUserMedia``. You can safely ignore it
__Prerequisites for use__
Because of the lack of widespread support for the ``getUserMedia`` API, and Google Chrome's insistance that the API call be made from a secure host, I can only guarantee this module works if:

1. You use >= ``Chrome 49`` or ``Firefox >=50``
2. You load the Framer prototype from ``127.0.0.1``, ``localhost``, or Framer cloud with ``https://..``

# Installation
1. Put the ``node_modules`` folder inside your Framer JS prototype's folder
2. Copy ``npm.coffee`` to the ``modules`` folder
3. Copy ``AudioAccess.coffee`` to the ``modules`` folder

_N.B._ It's a good idea to copy the files in this order. I've had problems with Framer Studio not recognising the modules in the ``node_modules`` folder, even in a brand new prototype, unless the folder is present before I load in ``npm.coffee``

#Usage
1. To use the module, first require it. Note the curly braces - they are required:
```
{ AudioAccess } = require 'AudioAccess'
```
2. Create a new AudioAccess object
```
AudioAccess = new AudioAccess
```
where the name of the object can be any friendly name you want to use.


