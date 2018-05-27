import FFT from './fft';

export default class AudioProcessor {
  constructor (context) {
    this.numSamps = 512;

    this.fft = new FFT(this.numSamps, 512);

    this.audioContext = context;
    this.audible = context.createDelay();

    this.analyser = context.createAnalyser();
    this.analyser.smoothingTimeConstant = 0.0;
    this.analyser.fftSize = this.numSamps * 2;

    this.audible.connect(this.analyser);

    // Split channels
    this.analyserL = context.createAnalyser();
    this.analyserL.smoothingTimeConstant = 0.0;
    this.analyserL.fftSize = this.numSamps * 2;

    this.analyserR = context.createAnalyser();
    this.analyserR.smoothingTimeConstant = 0.0;
    this.analyserR.fftSize = this.numSamps * 2;

    this.splitter = context.createChannelSplitter(2);

    this.audible.connect(this.splitter);
    this.splitter.connect(this.analyserL, 0);
    this.splitter.connect(this.analyserR, 1);
  }

  sampleAudio () {
    this.timeByteArray = new Uint8Array(this.numSamps);
    this.timeByteArrayL = new Uint8Array(this.numSamps);
    this.timeByteArrayR = new Uint8Array(this.numSamps);
    this.analyser.getByteTimeDomainData(this.timeByteArray);
    this.analyserL.getByteTimeDomainData(this.timeByteArrayL);
    this.analyserR.getByteTimeDomainData(this.timeByteArrayR);

    this.timeArray = [];
    this.timeArrayL = [];
    this.timeArrayR = [];
    const tempTimeL = [];
    const tempTimeR = [];
    let lastIdx = 0;
    for (let i = 0; i < this.numSamps; i++) {
      this.timeArray.push(this.timeByteArray[i] - 128);
      this.timeArrayL.push(this.timeByteArrayL[i] - 128);
      this.timeArrayR.push(this.timeByteArrayR[i] - 128);

      tempTimeL[i] = 0.5 * (this.timeArrayL[i] + this.timeArrayL[lastIdx]);
      tempTimeR[i] = 0.5 * (this.timeArrayR[i] + this.timeArrayR[lastIdx]);
      lastIdx = i;
    }

    this.freqArray = this.fft.timeToFrequencyDomain(this.timeArray);
    this.freqArrayL = this.fft.timeToFrequencyDomain(tempTimeL);
    this.freqArrayR = this.fft.timeToFrequencyDomain(tempTimeR);
  }

  connectAudio (audionode) {
    audionode.connect(this.audible);
  }

  disconnectAudio (audionode) {
    audionode.disconnect(this.audible);
  }
}
