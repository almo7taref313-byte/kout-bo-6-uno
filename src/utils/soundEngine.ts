import { JOKER_VOICE_BASE64 } from './jokerVoiceData';
import { MAKER_VOICE_BASE64 } from './makerVoiceData';
import { APPLAUSE_BASE64 } from './applauseVoiceData';
import {
  BAOON_LOSS_BASE64,
  SKIP_VOICES_BASE64,
  THROW_PAPER_BASE64,
} from './customVoicesData';
import { CUSTOM_BID_VOICES_BASE64 } from './malzomVoiceData';

const CUSTOM_SKIP_VOICES_STORAGE_KEY = 'kout_custom_skip_voices_v1';
const SOUND_ENABLED_STORAGE_KEY = 'kout_sound_enabled';

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const cleanB64 = base64.includes(',') ? base64.split(',')[1] : base64;
  const binaryString = window.atob(cleanB64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

class SoundEngineClass {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  private lastSlideTime: number = 0;
  private lastJokerVoiceTime: number = 0;
  private lastMakerVoiceTime: number = 0;
  private lastSkipIndex: number = -1;

  // مخازن Web Audio API (AudioBuffer) لضمان عمل جميع الأصوات 100% عبر قناة Ambient التي تحترم وضع الصامت في الآيفون وجميع الأجهزة
  private jokerVoiceBuffer: AudioBuffer | null = null;
  private isDecodingJokerVoice: boolean = false;
  private activeJokerSource: AudioBufferSourceNode | null = null;

  private makerVoiceBuffer: AudioBuffer | null = null;
  private isDecodingMakerVoice: boolean = false;
  private activeMakerSource: AudioBufferSourceNode | null = null;

  private applauseBuffer: AudioBuffer | null = null;
  private isDecodingApplause: boolean = false;
  private activeApplauseSource: AudioBufferSourceNode | null = null;

  private matchWinBuffer: AudioBuffer | null = null;
  private isDecodingMatchWin: boolean = false;
  private activeMatchWinSource: AudioBufferSourceNode | null = null;

  private skipBuffers: (AudioBuffer | null)[] = [];
  private isDecodingSkip: boolean[] = [];

  private customBidBuffers: Record<string, AudioBuffer | null> = {};
  private isDecodingCustomBid: Record<string, boolean> = {};
  private activeCustomBidSource: AudioBufferSourceNode | null = null;

  private baoonLossBuffer: AudioBuffer | null = null;
  private isDecodingBaoonLoss: boolean = false;

  private throwPaperBuffer: AudioBuffer | null = null;
  private isDecodingThrowPaper: boolean = false;

  private activeSkipSource: AudioBufferSourceNode | null = null;
  private activeBaoonLossSource: AudioBufferSourceNode | null = null;

  private applauseTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(CUSTOM_SKIP_VOICES_STORAGE_KEY);
        const savedSound = localStorage.getItem(SOUND_ENABLED_STORAGE_KEY);
        if (savedSound !== null) {
          this.enabled = savedSound !== 'false';
        }
      } catch {}

      this.applyAmbientAudioSession();

      const unlockOnGesture = () => {
        this.applyAmbientAudioSession();
        if (this.enabled) {
          this.init(true);
        }
      };
      window.addEventListener('touchend', unlockOnGesture, { passive: true });
      window.addEventListener('click', unlockOnGesture, { passive: true });
      window.addEventListener('pointerup', unlockOnGesture, { passive: true });
      window.addEventListener('keydown', unlockOnGesture, { passive: true });

      const handleVisibilityOrHide = () => {
        if (typeof document !== 'undefined' && document.hidden) {
          this.stopAllActiveSounds();
          if (this.ctx && (this.ctx.state as string) === 'running') {
            this.ctx.suspend().catch(() => {});
          }
        } else {
          this.applyAmbientAudioSession();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityOrHide);
      window.addEventListener('pagehide', handleVisibilityOrHide);
    }
  }

  // ضبط جلسة الصوت في المتصفح والنظام على "ambient" لكي يكتم الجهاز صوت اللعبة تلقائياً عند تفعيل زر الصامت أو كتم صوت الجهاز
  private applyAmbientAudioSession() {
    if (typeof navigator !== 'undefined' && 'audioSession' in navigator) {
      try {
        (navigator as unknown as { audioSession: { type: string } }).audioSession.type = 'ambient';
      } catch {}
    }
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    try {
      localStorage.setItem(SOUND_ENABLED_STORAGE_KEY, String(val));
    } catch {}
    if (!val) {
      this.stopAllActiveSounds();
      if (this.ctx && (this.ctx.state as string) === 'running') {
        this.ctx.suspend().catch(() => {});
      }
    } else {
      this.init(true);
    }
  }

  public stopAllActiveSounds() {
    this.stopSkipVoices();
    this.stopCustomBidVoices();
    this.stopApplause();
    if (this.activeJokerSource) {
      try {
        this.activeJokerSource.stop();
      } catch {}
      this.activeJokerSource = null;
    }
    if (this.activeMakerSource) {
      try {
        this.activeMakerSource.stop();
      } catch {}
      this.activeMakerSource = null;
    }
  }

  public getActiveSkipVoices(): string[] {
    return SKIP_VOICES_BASE64;
  }

  public getSkipVoicesCount(): number {
    return SKIP_VOICES_BASE64.length;
  }

  private decodeBase64Audio(
    base64: string,
    getExisting: () => AudioBuffer | null,
    setDecoded: (buf: AudioBuffer) => void,
    getIsDecoding: () => boolean,
    setIsDecoding: (val: boolean) => void,
    onReady?: (buf: AudioBuffer) => void
  ) {
    if (!this.ctx || typeof window === 'undefined') return;
    const existing = getExisting();
    if (existing) {
      if (onReady) onReady(existing);
      return;
    }
    if (getIsDecoding() && !onReady) return;
    setIsDecoding(true);
    try {
      const rawBuffer = base64ToArrayBuffer(base64);
      this.ctx.decodeAudioData(
        rawBuffer.slice(0),
        (decoded) => {
          setDecoded(decoded);
          setIsDecoding(false);
          if (onReady) onReady(decoded);
        },
        () => {
          setIsDecoding(false);
        }
      );
    } catch {
      setIsDecoding(false);
    }
  }

  private decodeJokerBuffer(onReady?: (buf: AudioBuffer) => void) {
    this.decodeBase64Audio(
      JOKER_VOICE_BASE64,
      () => this.jokerVoiceBuffer,
      (buf) => {
        this.jokerVoiceBuffer = buf;
      },
      () => this.isDecodingJokerVoice,
      (val) => {
        this.isDecodingJokerVoice = val;
      },
      onReady
    );
  }

  private decodeMakerBuffer(onReady?: (buf: AudioBuffer) => void) {
    this.decodeBase64Audio(
      MAKER_VOICE_BASE64,
      () => this.makerVoiceBuffer,
      (buf) => {
        this.makerVoiceBuffer = buf;
      },
      () => this.isDecodingMakerVoice,
      (val) => {
        this.isDecodingMakerVoice = val;
      },
      onReady
    );
  }

  private decodeSkipBuffer(index: number, onReady?: (buf: AudioBuffer) => void) {
    const list = this.getActiveSkipVoices();
    if (list.length === 0) return;
    const safeIdx = ((index % list.length) + list.length) % list.length;
    const base64 = list[safeIdx];
    if (!base64) return;
    this.decodeBase64Audio(
      base64,
      () => this.skipBuffers[safeIdx] ?? null,
      (buf) => {
        this.skipBuffers[safeIdx] = buf;
      },
      () => Boolean(this.isDecodingSkip[safeIdx]),
      (val) => {
        this.isDecodingSkip[safeIdx] = val;
      },
      onReady
    );
  }

  private decodeBaoonLossBuffer(onReady?: (buf: AudioBuffer) => void) {
    this.decodeBase64Audio(
      BAOON_LOSS_BASE64,
      () => this.baoonLossBuffer,
      (buf) => {
        this.baoonLossBuffer = buf;
      },
      () => this.isDecodingBaoonLoss,
      (val) => {
        this.isDecodingBaoonLoss = val;
      },
      onReady
    );
  }

  private decodeThrowPaperBuffer(onReady?: (buf: AudioBuffer) => void) {
    this.decodeBase64Audio(
      THROW_PAPER_BASE64,
      () => this.throwPaperBuffer,
      (buf) => {
        this.throwPaperBuffer = buf;
      },
      () => this.isDecodingThrowPaper,
      (val) => {
        this.isDecodingThrowPaper = val;
      },
      onReady
    );
  }

  private decodeApplauseBuffer(onReady?: (buf: AudioBuffer) => void) {
    this.decodeBase64Audio(
      APPLAUSE_BASE64,
      () => this.applauseBuffer,
      (buf) => {
        this.applauseBuffer = buf;
      },
      () => this.isDecodingApplause,
      (val) => {
        this.isDecodingApplause = val;
      },
      onReady
    );
  }

  private decodeMatchWinBuffer(onReady?: (buf: AudioBuffer) => void) {
    if (!this.ctx || typeof window === 'undefined') return;
    if (this.matchWinBuffer) {
      if (onReady) onReady(this.matchWinBuffer);
      return;
    }
    if (this.isDecodingMatchWin && !onReady) return;
    this.isDecodingMatchWin = true;
    fetch('/winners_celebration.mp3')
      .then((res) => res.arrayBuffer())
      .then((arrayBuf) => {
        if (!this.ctx) {
          this.isDecodingMatchWin = false;
          return;
        }
        this.ctx.decodeAudioData(
          arrayBuf,
          (decoded) => {
            this.matchWinBuffer = decoded;
            this.isDecodingMatchWin = false;
            if (onReady) onReady(decoded);
          },
          () => {
            this.isDecodingMatchWin = false;
          }
        );
      })
      .catch(() => {
        this.isDecodingMatchWin = false;
      });
  }

  init(_fromUserGesture: boolean = false) {
    this.applyAmbientAudioSession();

    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.enabled && (this.ctx.state as string) !== 'running') {
      this.ctx.resume().catch(() => {});
    }

    // فك تشفير جميع الأصوات مسبقاً في ذاكرة Web Audio API لتعمل فوراً وتلتزم بوضع الصامت في الجهاز 100%
    this.decodeJokerBuffer();
    this.decodeMakerBuffer();
    this.decodeApplauseBuffer();
    this.decodeMatchWinBuffer();
    const activeSkipList = this.getActiveSkipVoices();
    for (let i = 0; i < activeSkipList.length; i++) {
      this.decodeSkipBuffer(i);
    }
    for (const key of Object.keys(CUSTOM_BID_VOICES_BASE64)) {
      this.decodeCustomBidBuffer(key);
    }
    this.decodeBaoonLossBuffer();
    this.decodeThrowPaperBuffer();
  }

  private decodeCustomBidBuffer(key: string, onReady?: (buf: AudioBuffer) => void) {
    const base64 = CUSTOM_BID_VOICES_BASE64[key];
    if (!base64) return;
    this.decodeBase64Audio(
      base64,
      () => this.customBidBuffers[key] ?? null,
      (buf) => {
        this.customBidBuffers[key] = buf;
      },
      () => Boolean(this.isDecodingCustomBid[key]),
      (val) => {
        this.isDecodingCustomBid[key] = val;
      },
      onReady
    );
  }

  private playDecodedCustomBidBuffer(buf: AudioBuffer) {
    if (!this.ctx || !this.enabled) return;
    try {
      if ((this.ctx.state as string) !== 'running') {
        this.ctx.resume().catch(() => {});
      }
      this.stopCustomBidVoices();
      const source = this.ctx.createBufferSource();
      source.buffer = buf;
      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(1.25, this.ctx.currentTime);
      source.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      source.start(0);
      this.activeCustomBidSource = source;
    } catch {}
  }

  public stopCustomBidVoices() {
    if (this.activeCustomBidSource) {
      try {
        this.activeCustomBidSource.stop();
      } catch {}
      this.activeCustomBidSource = null;
    }
  }

  // تشغيل الأصوات المسجلة الخاصة بالمستخدم للمزايدة: (5، 6، 7، 8، باون، ملزوم)
  public playCustomBidVoice(val: number, forced: boolean = false) {
    if (!this.enabled) return;
    this.init();
    this.stopSkipVoices();
    this.stopCustomBidVoices();

    const key = forced ? 'forced' : String(val);
    if (!CUSTOM_BID_VOICES_BASE64[key]) {
      this.playBidTone(val === 9);
      return;
    }

    if (!this.ctx) return;
    const existing = this.customBidBuffers[key];
    if (existing) {
      this.playDecodedCustomBidBuffer(existing);
    } else {
      this.decodeCustomBidBuffer(key, (buf) => this.playDecodedCustomBidBuffer(buf));
    }
  }

  public playMalzomVoice() {
    this.playCustomBidVoice(5, true);
  }

  private playDecodedThrowPaperBuffer(buf: AudioBuffer) {
    if (!this.ctx || !this.enabled) return;
    try {
      if ((this.ctx.state as string) !== 'running') {
        this.ctx.resume().catch(() => {});
      }
      const source = this.ctx.createBufferSource();
      source.buffer = buf;

      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(1.0, this.ctx.currentTime);

      source.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      source.start(0);
    } catch {}
  }

  // تشغيل صوت رمي الورقة على الطاولة عبر Web Audio API حصراً ليحترم وضع الصامت في الجهاز
  private lastThrowTime: number = 0;

  playCardThrow() {
    if (!this.enabled) return;
    const nowMs = Date.now();
    if (nowMs - this.lastThrowTime < 80) return;
    this.lastThrowTime = nowMs;

    this.init();
    if (!this.ctx) return;

    if (this.throwPaperBuffer) {
      this.playDecodedThrowPaperBuffer(this.throwPaperBuffer);
    } else {
      this.decodeThrowPaperBuffer((buf) => this.playDecodedThrowPaperBuffer(buf));
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

  private playDecodedJokerBuffer(buf: AudioBuffer) {
    if (!this.ctx || !this.enabled) return;
    try {
      if ((this.ctx.state as string) !== 'running') {
        this.ctx.resume().catch(() => {});
      }
      if (this.activeJokerSource) {
        try {
          this.activeJokerSource.stop();
        } catch {}
        this.activeJokerSource = null;
      }
      const source = this.ctx.createBufferSource();
      source.buffer = buf;
      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(1.25, this.ctx.currentTime);
      source.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      source.start(0);
      this.activeJokerSource = source;
    } catch {}
  }

  private playDecodedMakerBuffer(buf: AudioBuffer) {
    if (!this.ctx || !this.enabled) return;
    try {
      if ((this.ctx.state as string) !== 'running') {
        this.ctx.resume().catch(() => {});
      }
      if (this.activeMakerSource) {
        try {
          this.activeMakerSource.stop();
        } catch {}
        this.activeMakerSource = null;
      }
      const source = this.ctx.createBufferSource();
      source.buffer = buf;
      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(1.25, this.ctx.currentTime);
      source.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      source.start(0);
      this.activeMakerSource = source;
    } catch {}
  }

  private playDecodedSkipBuffer(buf: AudioBuffer) {
    if (!this.ctx || !this.enabled) return;
    try {
      if ((this.ctx.state as string) !== 'running') {
        this.ctx.resume().catch(() => {});
      }
      if (this.activeSkipSource) {
        try {
          this.activeSkipSource.stop();
        } catch {}
        this.activeSkipSource = null;
      }
      const source = this.ctx.createBufferSource();
      source.buffer = buf;
      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(1.25, this.ctx.currentTime);
      source.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      source.start(0);
      this.activeSkipSource = source;
    } catch {}
  }

  private playDecodedBaoonLossBuffer(buf: AudioBuffer) {
    if (!this.ctx || !this.enabled) return;
    try {
      if ((this.ctx.state as string) !== 'running') {
        this.ctx.resume().catch(() => {});
      }
      if (this.activeBaoonLossSource) {
        try {
          this.activeBaoonLossSource.stop();
        } catch {}
        this.activeBaoonLossSource = null;
      }
      const source = this.ctx.createBufferSource();
      source.buffer = buf;
      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(1.25, this.ctx.currentTime);
      source.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      source.start(0);
      this.activeBaoonLossSource = source;
    } catch {}
  }

  playJokerVoice() {
    if (!this.enabled) return;
    const nowMs = Date.now();
    if (nowMs - this.lastJokerVoiceTime < 250) return;
    this.lastJokerVoiceTime = nowMs;

    this.init();
    if (!this.ctx) return;

    if (this.jokerVoiceBuffer) {
      this.playDecodedJokerBuffer(this.jokerVoiceBuffer);
    } else {
      this.decodeJokerBuffer((buf) => this.playDecodedJokerBuffer(buf));
    }
  }

  playMakerVoice() {
    if (!this.enabled) return;
    const nowMs = Date.now();
    if (nowMs - this.lastMakerVoiceTime < 250) return;
    this.lastMakerVoiceTime = nowMs;

    this.init();
    if (!this.ctx) return;

    if (this.makerVoiceBuffer) {
      this.playDecodedMakerBuffer(this.makerVoiceBuffer);
    } else {
      this.decodeMakerBuffer((buf) => this.playDecodedMakerBuffer(buf));
    }
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
    if ((this.ctx.state as string) !== 'running') {
      this.ctx.resume().catch(() => {});
    }
    const now = this.ctx.currentTime;

    const chord = isBaoon ? [523.25, 659.25, 783.99, 1046.5] : [440, 554.37, 659.25];
    chord.forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.04);
      gain.gain.setValueAtTime(0.28, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.26);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.04);
      osc.stop(now + i * 0.04 + 0.26);
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

  // صوت عداد الوقت: صامت تماماً حتى آخر 5 ثوانٍ حيث يعمل بصوته المتسارع
  playTimerTick(secondsLeft: number = 10) {
    if (!this.enabled) return;
    const sec = Math.round(secondsLeft);
    if (sec > 5 || sec <= 0) return;

    this.init();
    if (!this.ctx) return;
    if ((this.ctx.state as string) !== 'running') {
      this.ctx.resume().catch(() => {});
    }

    const now = this.ctx.currentTime;

    const urgentFreqMap: Record<number, number> = {
      5: 880.0,     // A5
      4: 932.33,    // Bb5
      3: 987.77,    // B5
      2: 1046.5,    // C6
      1: 1174.66,   // D6
    };
    const baseFreq = urgentFreqMap[sec] || 987.77;
    const peakGain = 0.115;

    const pulses = [
      { offset: 0, freq: baseFreq, dur: 0.075 },
      { offset: 0.09, freq: baseFreq * 1.2, dur: 0.085 },
    ];

    pulses.forEach((p) => {
      if (!this.ctx) return;
      const startTime = now + p.offset;
      const osc = this.ctx.createOscillator();
      const harmOsc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      const harmGain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(p.freq, startTime);

      harmOsc.type = 'sine';
      harmOsc.frequency.setValueAtTime(p.freq * 1.5, startTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2800, startTime);
      filter.Q.setValueAtTime(1.0, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + p.dur);

      harmGain.gain.setValueAtTime(peakGain * 0.3, startTime);
      harmGain.gain.exponentialRampToValueAtTime(0.0001, startTime + p.dur);

      osc.connect(filter);
      harmOsc.connect(harmGain);
      harmGain.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      harmOsc.start(startTime);
      osc.stop(startTime + p.dur + 0.01);
      harmOsc.stop(startTime + p.dur + 0.01);
    });
  }

  // إيقاف أي صوت "طاف" سابق قيد التشغيل لمنع تداخل الأصوات بين اللاعبين والبوتات
  stopSkipVoices() {
    if (this.activeSkipSource) {
      try {
        this.activeSkipSource.stop();
      } catch {}
      this.activeSkipSource = null;
    }
  }

  // تشغيل صوت "طاف" بتوزيع عشوائي من الأصوات المخصصة عبر Web Audio API
  playRandomSkipVoice(specificIndex?: number): number {
    if (!this.enabled) return 0;
    this.init();
    this.stopSkipVoices();
    this.stopCustomBidVoices();

    const activeSkipList = this.getActiveSkipVoices();
    const count = activeSkipList.length;
    if (count === 0) {
      this.playPassTone();
      return 0;
    }

    let idx: number;
    if (typeof specificIndex === 'number') {
      idx = ((specificIndex % count) + count) % count;
    } else if (count === 1) {
      idx = 0;
    } else {
      do {
        idx = Math.floor(Math.random() * count);
      } while (idx === this.lastSkipIndex);
    }
    this.lastSkipIndex = idx;

    if (!this.ctx) return idx;
    const existing = this.skipBuffers[idx];
    if (existing) {
      this.playDecodedSkipBuffer(existing);
    } else {
      this.decodeSkipBuffer(idx, (buf) => this.playDecodedSkipBuffer(buf));
    }
    return idx;
  }

  playLoserSkipVoice() {
    this.playRandomSkipVoice();
  }

  playWinnerSkipVoice() {
    this.playRandomSkipVoice();
  }

  playTiedSkipVoice(specificIndex?: number): number {
    return this.playRandomSkipVoice(specificIndex);
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

  // إيقاف صوت التصفيق فوراً وبشكل قاطع ومسح أي مؤقتات نشطة
  stopApplause() {
    if (this.applauseTimer) {
      clearTimeout(this.applauseTimer);
      this.applauseTimer = null;
    }
    if (this.activeApplauseSource) {
      try {
        this.activeApplauseSource.stop();
      } catch {}
      this.activeApplauseSource = null;
    }
    if (this.activeMatchWinSource) {
      try {
        this.activeMatchWinSource.stop();
      } catch {}
      this.activeMatchWinSource = null;
    }
    if (this.activeBaoonLossSource) {
      try {
        this.activeBaoonLossSource.stop();
      } catch {}
      this.activeBaoonLossSource = null;
    }
  }

  private playDecodedApplauseBuffer(buf: AudioBuffer, durationMs: number) {
    if (!this.ctx || !this.enabled) return;
    try {
      if ((this.ctx.state as string) !== 'running') {
        this.ctx.resume().catch(() => {});
      }
      if (this.activeApplauseSource) {
        try {
          this.activeApplauseSource.stop();
        } catch {}
        this.activeApplauseSource = null;
      }
      const now = this.ctx.currentTime;
      const durationSec = Math.max(0.3, durationMs / 1000);
      const fadeSec = Math.min(0.22, durationSec * 0.2);

      const source = this.ctx.createBufferSource();
      source.buffer = buf;

      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(1.0, now);
      gainNode.gain.setValueAtTime(1.0, now + Math.max(0.05, durationSec - fadeSec));
      gainNode.gain.linearRampToValueAtTime(0.0001, now + durationSec);

      source.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      source.start(now);
      source.stop(now + durationSec);
      this.activeApplauseSource = source;

      this.applauseTimer = setTimeout(() => {
        this.stopApplause();
      }, durationMs);
    } catch {}
  }

  private playDecodedMatchWinBuffer(buf: AudioBuffer) {
    if (!this.ctx || !this.enabled) return;
    try {
      if ((this.ctx.state as string) !== 'running') {
        this.ctx.resume().catch(() => {});
      }
      if (this.activeMatchWinSource) {
        try {
          this.activeMatchWinSource.stop();
        } catch {}
        this.activeMatchWinSource = null;
      }
      const source = this.ctx.createBufferSource();
      source.buffer = buf;

      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(1.0, this.ctx.currentTime);

      source.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      source.start(0);
      this.activeMatchWinSource = source;
    } catch {}
  }

  // تشغيل الصوت المخصص عند خسارة الباون لأي فريق عبر Web Audio API
  playBaoonLossVoice() {
    if (!this.enabled) return;
    this.init();
    this.stopApplause();
    if (!this.ctx) return;

    if (this.baoonLossBuffer) {
      this.playDecodedBaoonLossBuffer(this.baoonLossBuffer);
    } else {
      this.decodeBaoonLossBuffer((buf) => this.playDecodedBaoonLossBuffer(buf));
    }
  }

  // تشغيل صوت تصفيق واحتفال الفوز بالمباراة الكاملة عبر Web Audio API ليحترم وضع الصامت في الجهاز
  playMatchWinCelebration() {
    if (!this.enabled) return;
    this.init();
    this.stopApplause();
    if (!this.ctx) return;

    if (this.matchWinBuffer) {
      this.playDecodedMatchWinBuffer(this.matchWinBuffer);
    } else {
      this.decodeMatchWinBuffer((buf) => this.playDecodedMatchWinBuffer(buf));
    }
  }

  // تشغيل فوري ومضبوط زمنياً لصوت التصفيق عبر Web Audio API
  playCheeringAndWhistle(durationMs: number = 2400) {
    if (!this.enabled) return;
    this.init();
    this.stopApplause();
    if (!this.ctx) return;

    if (this.applauseBuffer) {
      this.playDecodedApplauseBuffer(this.applauseBuffer, durationMs);
    } else {
      this.decodeApplauseBuffer((buf) => this.playDecodedApplauseBuffer(buf, durationMs));
    }
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
      start += note.duration - 0.03;
    });
  }
}

export const soundEngine = new SoundEngineClass();
