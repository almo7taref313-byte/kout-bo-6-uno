class SoundEngineClass {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  private lastSlideTime: number = 0;
  private applauseAudio: HTMLAudioElement | null = null;
  private applauseTimer: ReturnType<typeof setTimeout> | null = null;
  private applauseFadeInterval: ReturnType<typeof setInterval> | null = null;

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    // تحميل ملف التصفيق مسبقاً في ذاكرة المتصفح ليعمل فوراً دون أي تأخير
    if (!this.applauseAudio && typeof window !== 'undefined') {
      try {
        this.applauseAudio = new Audio('/applause.mp3');
        this.applauseAudio.preload = 'auto';
        this.applauseAudio.load();
      } catch {}
    }
  }

  playCardSlide() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    if (now - this.lastSlideTime < 0.08) return;
    this.lastSlideTime = now;

    const pitchVariance = 0.94 + Math.random() * 0.12;
    const duration = 0.045;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const noiseBuf = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const progress = i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * Math.sin(progress * Math.PI) * Math.exp(-progress * 4.0);
    }

    const slideSource = this.ctx.createBufferSource();
    slideSource.buffer = noiseBuf;

    const slideFilter = this.ctx.createBiquadFilter();
    slideFilter.type = 'bandpass';
    slideFilter.frequency.setValueAtTime(800 * pitchVariance, now);
    slideFilter.frequency.linearRampToValueAtTime(450 * pitchVariance, now + duration);
    slideFilter.Q.setValueAtTime(1.0, now);

    const slideGain = this.ctx.createGain();
    slideGain.gain.setValueAtTime(0.09, now);
    slideGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    slideSource.connect(slideFilter);
    slideFilter.connect(slideGain);
    slideGain.connect(this.ctx.destination);
    slideSource.start(now);
  }

  playJokerSlam() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const duration = 0.13;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const noiseBuf = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const progress = i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * Math.sin(progress * Math.PI) * Math.exp(-progress * 2.5);
    }

    const slamNoise = this.ctx.createBufferSource();
    slamNoise.buffer = noiseBuf;

    const slamFilter = this.ctx.createBiquadFilter();
    slamFilter.type = 'bandpass';
    slamFilter.frequency.setValueAtTime(1200, now);
    slamFilter.frequency.linearRampToValueAtTime(500, now + duration);
    slamFilter.Q.setValueAtTime(1.8, now);

    const slamGain = this.ctx.createGain();
    slamGain.gain.setValueAtTime(0.3, now);
    slamGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    slamNoise.connect(slamFilter);
    slamFilter.connect(slamGain);
    slamGain.connect(this.ctx.destination);
    slamNoise.start(now);
  }

  playTrickSweep() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.13);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }

    const sweepNoise = this.ctx.createBufferSource();
    sweepNoise.buffer = noiseBuffer;

    const sweepFilter = this.ctx.createBiquadFilter();
    sweepFilter.type = 'bandpass';
    sweepFilter.frequency.setValueAtTime(1000, now);
    sweepFilter.frequency.linearRampToValueAtTime(2000, now + 0.11);
    sweepFilter.Q.setValueAtTime(1.6, now);

    const sweepGain = this.ctx.createGain();
    sweepGain.gain.setValueAtTime(0.2, now);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

    sweepNoise.connect(sweepFilter);
    sweepFilter.connect(sweepGain);
    sweepGain.connect(this.ctx.destination);
    sweepNoise.start(now);
  }

  playBidTone(isBaoon = false) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const chord = isBaoon ? [523.25, 659.25, 783.99, 1046.5] : [440, 554.37, 659.25];
    chord.forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.04);
      gain.gain.setValueAtTime(0.12, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.24);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.04);
      osc.stop(now + i * 0.04 + 0.24);
    });
  }

  playPassTone() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(220, now + 0.12);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  playVictoryFanfare(isBaoon = false) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const notes = isBaoon ? [523.25, 659.25, 783.99, 1046.5, 1318.5] : [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + i * 0.06);
      gain.gain.setValueAtTime(0.18, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.3);
    });
  }

  playBustedSound() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const lowChords = [280, 240, 190, 140];
    lowChords.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);
      gain.gain.setValueAtTime(0.13, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.22);
    });
  }

  // إيقاف صوت التصفيق فوراً وبشكل قاطع ومسح أي مؤقتات خفوت نشطة
  stopApplause() {
    if (this.applauseTimer) {
      clearTimeout(this.applauseTimer);
      this.applauseTimer = null;
    }
    if (this.applauseFadeInterval) {
      clearInterval(this.applauseFadeInterval);
      this.applauseFadeInterval = null;
    }
    if (this.applauseAudio) {
      try {
        this.applauseAudio.pause();
        this.applauseAudio.currentTime = 0;
        this.applauseAudio.volume = 0.95;
      } catch {}
    }
  }

  // تشغيل فوري ومضبوط زمنياً لصوت التصفيق يبدأ لحظة الفوز ويتلاشى وينتهي تماماً قبل ظهور المزايدة
  playCheeringAndWhistle(durationMs: number = 2400) {
    if (!this.enabled) return;
    try {
      this.stopApplause();
      if (!this.applauseAudio && typeof window !== 'undefined') {
        this.applauseAudio = new Audio('/applause.mp3');
      }
      if (!this.applauseAudio) return;

      const audio = this.applauseAudio;
      audio.currentTime = 0;
      audio.volume = 0.95;
      audio.play().catch(() => {});

      // يبدأ الخفوت التنازلي قبل نهاية المدة بـ 450ms ليتلاشى وينعدم تماماً عند انتهاء المدة
      const fadeStartMs = Math.max(600, durationMs - 450);
      this.applauseTimer = setTimeout(() => {
        this.applauseFadeInterval = setInterval(() => {
          if (audio.volume > 0.12) {
            audio.volume = Math.max(0, audio.volume - 0.2);
          } else {
            this.stopApplause();
          }
        }, 40);
      }, fadeStartMs);
    } catch {}
  }

  playSadTromboneMock() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const notes = [
      { freq: 311.13, duration: 0.32, vibrato: true },
      { freq: 293.66, duration: 0.32, vibrato: true },
      { freq: 277.18, duration: 0.32, vibrato: true },
      { freq: 246.94, duration: 0.85, slideDown: true },
    ];

    let start = now + 0.05;
    notes.forEach((note) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(note.freq, start);

      if (note.slideDown) {
        osc.frequency.exponentialRampToValueAtTime(140, start + note.duration);
      } else if (note.vibrato) {
        osc.frequency.linearRampToValueAtTime(note.freq + 6, start + note.duration * 0.5);
        osc.frequency.linearRampToValueAtTime(note.freq - 6, start + note.duration);
      }

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(700, start);
      filter.frequency.linearRampToValueAtTime(320, start + note.duration);

      gain.gain.setValueAtTime(0.24, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + note.duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(start);
      osc.stop(start + note.duration);

      start += note.duration + 0.06;
    });
  }
}

export const soundEngine = new SoundEngineClass();
