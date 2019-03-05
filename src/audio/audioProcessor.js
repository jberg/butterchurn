import FFT from './fft';

export default class AudioProcessor {
  constructor (context) {
    this.numSamps = 512;
    this.fftSize = this.numSamps * 2;

    this.fft = new FFT(this.fftSize, 512);

    if (context) {
      this.audioContext = context;
      this.audible = context.createDelay();

      this.analyser = context.createAnalyser();
      this.analyser.smoothingTimeConstant = 0.0;
      this.analyser.fftSize = this.fftSize;

      this.audible.connect(this.analyser);

      // Split channels
      this.analyserL = context.createAnalyser();
      this.analyserL.smoothingTimeConstant = 0.0;
      this.analyserL.fftSize = this.fftSize;

      this.analyserR = context.createAnalyser();
      this.analyserR.smoothingTimeConstant = 0.0;
      this.analyserR.fftSize = this.fftSize;

      this.splitter = context.createChannelSplitter(2);

      this.audible.connect(this.splitter);
      this.splitter.connect(this.analyserL, 0);
      this.splitter.connect(this.analyserR, 1);

      // New Stuff
      this.timeByteArray = new Uint8Array(this.fftSize);
      this.timeByteArrayL = new Uint8Array(this.fftSize);
      this.timeByteArrayR = new Uint8Array(this.fftSize);

      this.timeArray = new Int8Array(this.fftSize);
      this.timeByteArraySignedL = new Int8Array(this.fftSize);
      this.timeByteArraySignedR = new Int8Array(this.fftSize);


      this.timeArrayL = new Int8Array(this.numSamps);
      this.timeArrayR = new Int8Array(this.numSamps);
    }
  }

  sampleAudio () {
    this.analyser.getByteTimeDomainData(this.timeByteArray);
    this.analyserL.getByteTimeDomainData(this.timeByteArrayL);
    this.analyserR.getByteTimeDomainData(this.timeByteArrayR);

    this.updateAudio();
  }

  updateAudio () {
    // let lastIdx = 0;
    for (let i = 0, j=0; i < this.fftSize; i++) {
      // Unsigned to Signed
      this.timeArray[i] = this.timeByteArray[i] - 128;
      this.timeByteArraySignedL[i] = this.timeByteArrayL[i] - 128;
      this.timeByteArraySignedR[i] = this.timeByteArrayR[i] - 128;

      // Undersampled
      if (i & 2) { // Equivalent to i % 2
        this.timeArrayL[j] = this.timeByteArraySignedL[i];
        this.timeArrayR[j] = this.timeByteArraySignedR[i];
        j++;
      }

      // Test no smoothing
      // tempTimeL[i] = 0.5 * (this.timeArrayL[i] + this.timeArrayL[lastIdx]);
      // tempTimeR[i] = 0.5 * (this.timeArrayR[i] + this.timeArrayR[lastIdx]);
      // lastIdx = i;
    }

    // Use full width samples for the FFT
    this.freqArray = this.fft.timeToFrequencyDomain(this.timeArray);
    this.freqArrayL = this.fft.timeToFrequencyDomain(this.timeByteArraySignedL);
    this.freqArrayR = this.fft.timeToFrequencyDomain(this.timeByteArraySignedR);
  }

  connectAudio (audionode) {
    audionode.connect(this.audible);
  }

  disconnectAudio (audionode) {
    audionode.disconnect(this.audible);
  }
}
