export default class AudioLevels {
  constructor (audio) {
    this.audio = audio;

    this.bass = 1;
    this.bass_att = 1;
    this.bass_imm = 0;
    this.bass_avg = 1;
    this.bass_long_avg = 1;

    this.mid = 1;
    this.mid_att = 1;
    this.mid_imm = 0;
    this.mid_avg = 1;
    this.mid_long_avg = 1;

    this.treb = 1;
    this.treb_att = 1;
    this.treb_imm = 0;
    this.treb_avg = 1;
    this.treb_long_avg = 1;
  }

  static isFiniteNumber (num) {
    return (Number.isFinite(num) && !Number.isNaN(num));
  }

  static adjustRateToFPS (rate, baseFPS, FPS) {
    const ratePerSecond = rate ** baseFPS;
    const ratePerFrame = ratePerSecond ** (1.0 / FPS);

    return ratePerFrame;
  }

  updateAudioLevels (sampleTimeDelta, frame) {
    if (this.audio.freqArray.length > 0) {
      let effectiveFPS = 1000 / sampleTimeDelta;
      if (!AudioLevels.isFiniteNumber(effectiveFPS) || effectiveFPS < 15) {
        effectiveFPS = 15;
      } else if (effectiveFPS > 120) {
        effectiveFPS = 120;
      }

      const val = [0.0, 0.0, 0.0];
      const imm = [0.0, 0.0, 0.0];
      for (let i = 0; i < 3; i++) {
        const start = Math.floor(this.audio.numSamps * (i / 6));
        const end = Math.floor(this.audio.numSamps * ((i + 1) / 6));
        for (let j = start; j < end; j++) {
          imm[i] += this.audio.freqArray[j];
        }
      }

      const att = [this.bass_att, this.mid_att, this.treb_att];
      const avg = [this.bass_avg, this.mid_avg, this.treb_avg];
      const longAvg = [this.bass_long_avg, this.mid_long_avg, this.treb_long_avg];
      for (let i = 0; i < 3; i++) {
        let rate;
        if (imm[i] > avg[i]) {
          rate = 0.2;
        } else {
          rate = 0.5;
        }
        rate = AudioLevels.adjustRateToFPS(rate, 30.0, effectiveFPS);
        avg[i] = (avg[i] * rate) + (imm[i] * (1 - rate));

        if (frame < 50) {
          rate = 0.9;
        } else {
          rate = 0.992;
        }
        rate = AudioLevels.adjustRateToFPS(rate, 30.0, effectiveFPS);
        longAvg[i] = (longAvg[i] * rate) + (imm[i] * (1 - rate));

        if (Math.abs(longAvg[i]) < 0.001) {
          val[i] = 1.0;
          att[i] = 1.0;
        } else {
          val[i] = imm[i] / longAvg[i];
          att[i] = avg[i] / longAvg[i];
        }
      }

      this.bass = val[0];
      this.mid = val[1];
      this.treb = val[2];

      this.bass_att = att[0];
      this.mid_att = att[1];
      this.treb_att = att[2];

      this.bass_imm = imm[0];
      this.mid_imm = imm[1];
      this.treb_imm = imm[2];

      this.bass_avg = avg[0];
      this.mid_avg = avg[1];
      this.treb_avg = avg[2];

      this.bass_long_avg = longAvg[0];
      this.mid_long_avg = longAvg[1];
      this.treb_long_avg = longAvg[2];
    }
  }
}
