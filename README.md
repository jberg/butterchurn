# Butterchurn

Butterchurn is a WebGL implementation of the Milkdrop Visualizer


## [Try it out](https://butterchurnviz.com)

[![Screenshot of Butterchurn](https://butterchurnviz.com/static/img/preview.png)](https://butterchurnviz.com)


## Usage

### Installation

With [yarn](https://yarnpkg.com/) or [npm](https://npmjs.org/) installed, run

    $ yarn add butterchurn butterchurn-presets

### Create a visualizer

```JavaScript
import butterchurn from 'butterchurn';
import butterchurnPresets from 'butterchurn-presets';

// initialize audioContext and get canvas

const visualizer = butterchurn.createVisualizer(audioContext, canvas, {
  width: 800,
  height: 600
});

// get audioNode from audio source or microphone

visualizer.connectAudio(audioNode);

// load a preset

const presets = butterchurnPresets.getPresets();
const preset = presets['Flexi, martin + geiss - dedicated to the sherwin maxawow'];

visualizer.loadPreset(preset, 0.0); // 2nd argument is the number of seconds to blend presets

// resize visualizer

visualizer.setRendererSize(1600, 1200);

// render a frame

visualizer.render();
```


## Thanks

* [Ryan Geiss](http://www.geisswerks.com/) for creating [MilkDrop](http://www.geisswerks.com/about_milkdrop.html)
* Nullsoft for creating [Winamp](http://www.winamp.com/)
* All the amazing preset creators, special thanks to [Flexi](https://twitter.com/Flexi23)


## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
