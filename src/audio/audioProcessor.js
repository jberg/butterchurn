import FFT from "./fft";

export default class AudioProcessor {
  constructor(context) {
    this.numSamps = 512;
    this.fftSize = this.numSamps * 2;

    this.fft = new FFT(this.fftSize, 512, true);

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
    }

    // Initialised once as typed arrays
    // Used for webaudio API raw (time domain) samples. 0 -> 255
    this.timeByteArray = new Uint8Array(this.fftSize);
    this.timeByteArrayL = new Uint8Array(this.fftSize);
    this.timeByteArrayR = new Uint8Array(this.fftSize);

    // Signed raw samples shifted to -128 -> 127
    this.timeArray = new Int8Array(this.fftSize);
    this.timeByteArraySignedL = new Int8Array(this.fftSize);
    this.timeByteArraySignedR = new Int8Array(this.fftSize);

    // Temporary array for smoothing
    this.tempTimeArrayL = new Int8Array(this.fftSize);
    this.tempTimeArrayR = new Int8Array(this.fftSize);

    // Undersampled from this.fftSize to this.numSamps
    this.timeArrayL = new Int8Array(this.numSamps);
    this.timeArrayR = new Int8Array(this.numSamps);
  }

  sampleAudio() {
    this.analyser.getByteTimeDomainData(this.timeByteArray);
    this.analyserL.getByteTimeDomainData(this.timeByteArrayL);
    this.analyserR.getByteTimeDomainData(this.timeByteArrayR);
    this.processAudio();
  }
  updateAudio(timeByteArray, timeByteArrayL, timeByteArrayR) {
    this.timeByteArray.set(timeByteArray);
    this.timeByteArrayL.set(timeByteArrayL);
    this.timeByteArrayR.set(timeByteArrayR);
    this.processAudio();
  }
  /* eslint-disable no-bitwise */
  processAudio() {
    for (let i = 0, j = 0, lastIdx = 0; i < this.fftSize; i++) {
      // Shift Unsigned to Signed about 0
      this.timeArray[i] = this.timeByteArray[i] - 128;
      this.timeByteArraySignedL[i] = this.timeByteArrayL[i] - 128;
      this.timeByteArraySignedR[i] = this.timeByteArrayR[i] - 128;

      this.tempTimeArrayL[i] =
        0.5 *
        (this.timeByteArraySignedL[i] + this.timeByteArraySignedL[lastIdx]);
      this.tempTimeArrayR[i] =
        0.5 *
        (this.timeByteArraySignedR[i] + this.timeByteArraySignedR[lastIdx]);

      // Undersampled
      if (i % 2 === 0) {
        this.timeArrayL[j] = this.tempTimeArrayL[i];
        this.timeArrayR[j] = this.tempTimeArrayR[i];
        j += 1;
      }

      lastIdx = i;
    }

    // Use full width samples for the FFT
    this.freqArray = this.fft.timeToFrequencyDomain(this.timeArray);
    this.freqArrayL = this.fft.timeToFrequencyDomain(this.timeByteArraySignedL);
    this.freqArrayR = this.fft.timeToFrequencyDomain(this.timeByteArraySignedR);
  }

  connectAudio(audionode) {
    audionode.connect(this.audible);
  }

  disconnectAudio(audionode) {
    audionode.disconnect(this.audible);
  }
  /* eslint-enable no-bitwise */
}
