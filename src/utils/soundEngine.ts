import { JOKER_VOICE_BASE64 } from './jokerVoiceData';
import { MAKER_VOICE_BASE64 } from './makerVoiceData';
import { APPLAUSE_BASE64 } from './applauseVoiceData';
import {
  BAOON_LOSS_BASE64,
  SKIP_VOICES_BASE64,
  THROW_PAPER_BASE64,
} from './customVoicesData';

const CUSTOM_SKIP_VOICES_STORAGE_KEY = 'kout_custom_skip_voices_v1';

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

function toAudioDataUrl(b64: string): string {
  if (b64.startsWith('data:')) return b64;
  const mime = b64.startsWith('UklGR') ? 'audio/wav' : 'audio/mpeg';
  return `data:${mime};base64,${b64}`;
}

const JOKER_AUDIO_URL = '/nezal_alwahsh.mp3?v=11';
const MAKER_AUDIO_URL = '/yakom_almaikar.mp3?v=3';

class SoundEngineClass {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  private lastSlideTime: number = 0;
  private lastJokerVoiceTime: number = 0;
  private lastMakerVoiceTime: number = 0;
  private applauseAudio: HTMLAudioElement | null = null;
  private matchWinAudio: HTMLAudioElement | null = null;

  // عناصر الصوت عبر HTMLAudioElement (محمّلة مباشرة من الذاكرة Base64 + مسار الملف العام لضمان سرعة 0ms)
  private skipAudios: HTMLAudioElement[] = [];
  private lastSkipIndex: number = -1;
  private baoonLossAudio: HTMLAudioElement | null = null;
  private throwPaperAudio: HTMLAudioElement | null = null;
  private jokerVoiceAudio: HTMLAudioElement | null = null;
  private jokerVoiceLoadedOnGesture: boolean = false;
  private makerVoiceAudio: HTMLAudioElement | null = null;
  private makerVoiceLoadedOnGesture: boolean = false;

  // مخازن Web Audio API (AudioBuffer) لضمان عمل جميع الأصوات 100% في أدوار البوتات (setTimeout) واللاعبين على جميع الهواتف
  private jokerVoiceBuffer: AudioBuffer | null = null;
  private isDecodingJokerVoice: boolean = false;
  private activeJokerSource: AudioBufferSourceNode | null = null;

  private makerVoiceBuffer: AudioBuffer | null = null;
  private isDecodingMakerVoice: boolean = false;
  private activeMakerSource: AudioBufferSourceNode | null = null;

  private applauseBuffer: AudioBuffer | null = null;
  private isDecodingApplause: boolean = false;
  private activeApplauseSource: AudioBufferSourceNode | null = null;

  private skipBuffers: (AudioBuffer | null)[] = [];
  private isDecodingSkip: boolean[] = [];

  private baoonLossBuffer: AudioBuffer | null = null;
  private isDecodingBaoonLoss: boolean = false;

  private throwPaperBuffer: AudioBuffer | null = null;
  private isDecodingThrowPaper: boolean = false;

  private activeSkipSource: AudioBufferSourceNode | null = null;
  private activeBaoonLossSource: AudioBufferSourceNode | null = null;

  private applauseTimer: ReturnType<typeof setTimeout> | null = null;
  private applauseFadeInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(CUSTOM_SKIP_VOICES_STORAGE_KEY);
      } catch {}

      const unlockOnGesture = () => {
        this.init(true);
      };
      window.addEventListener('touchend', unlockOnGesture, { passive: true });
      window.addEventListener('click', unlockOnGesture, { passive: true });
      window.addEventListener('pointerup', unlockOnGesture, { passive: true });
      window.addEventListener('keydown', unlockOnGesture, { passive: true });
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

  init(fromUserGesture: boolean = false) {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && (this.ctx.state as string) !== 'running') {
      this.ctx.resume().catch(() => {});
    }

    if (fromUserGesture && typeof navigator !== 'undefined' && 'audioSession' in navigator) {
      try {
        (navigator as unknown as { audioSession: { type: string } }).audioSession.type = 'playback';
      } catch {}
    }

    // فك تشفير جميع الأصوات المخصصة مسبقاً في ذاكرة AudioContext لتعمل فوراً حتى في أدوار البوتات (setTimeout)
    this.decodeJokerBuffer();
    this.decodeMakerBuffer();
    this.decodeApplauseBuffer();
    const activeSkipList = this.getActiveSkipVoices();
    for (let i = 0; i < activeSkipList.length; i++) {
      this.decodeSkipBuffer(i);
    }
    this.decodeBaoonLossBuffer();
    this.decodeThrowPaperBuffer();

    // تحميل ملف التصفيق مسبقاً من الذاكرة Base64 ليعمل فوراً (0ms) بالتزامن مع ظهور واختفاء "كفو شباب"
    if (!this.applauseAudio && typeof window !== 'undefined') {
      try {
        this.applauseAudio = new Audio(`data:audio/mpeg;base64,${APPLAUSE_BASE64}`);
        this.applauseAudio.preload = 'auto';
        this.applauseAudio.load();
      } catch {}
    }

    // تحميل ملف احتفال الفوز بالمباراة الكاملة مسبقاً ليعمل فوراً عند ظهور النتيجة النهائية
    if (!this.matchWinAudio && typeof window !== 'undefined') {
      try {
        this.matchWinAudio = new Audio('/winners_celebration.mp3');
        this.matchWinAudio.preload = 'auto';
        this.matchWinAudio.load();
      } catch {}
    }

    // تهيئة عناصر الصوت لزر "طاف" وخسارة الباون ورمي الورقة عبر البيانات المدمجة في الذاكرة لتجنب أي تأخير بالشبكة
    if (this.skipAudios.length === 0 && activeSkipList.length > 0 && typeof window !== 'undefined') {
      try {
        this.skipAudios = activeSkipList.map((b64) => {
          const a = new Audio(toAudioDataUrl(b64));
          a.preload = 'auto';
          return a;
        });
      } catch {}
    }

    if (!this.baoonLossAudio && typeof window !== 'undefined') {
      try {
        this.baoonLossAudio = new Audio(`data:audio/mpeg;base64,${BAOON_LOSS_BASE64}`);
        this.baoonLossAudio.preload = 'auto';
      } catch {}
    }

    if (!this.throwPaperAudio && typeof window !== 'undefined') {
      try {
        this.throwPaperAudio = new Audio(`data:audio/wav;base64,${THROW_PAPER_BASE64}`);
        this.throwPaperAudio.preload = 'auto';
      } catch {}
    }

    // تحميل ملف صوت الجيكر مباشرة من الذاكرة Base64 لضمان استجابة فورية 0ms دون أي تأخير شبكة
    if (!this.jokerVoiceAudio && typeof window !== 'undefined') {
      try {
        this.jokerVoiceAudio = new Audio(`data:audio/mpeg;base64,${JOKER_VOICE_BASE64}`);
        this.jokerVoiceAudio.preload = 'auto';
        this.jokerVoiceAudio.load();
      } catch {}
    }

    if (
      fromUserGesture &&
      !this.jokerVoiceLoadedOnGesture &&
      this.jokerVoiceAudio &&
      Date.now() - this.lastJokerVoiceTime > 1200
    ) {
      try {
        this.jokerVoiceAudio.load();
        this.jokerVoiceLoadedOnGesture = true;
      } catch {}
    }

    // تحميل ملف صوت الميكر ("ياكم الميكر") مباشرة من الذاكرة Base64 لضمان استجابة فورية 0ms
    if (!this.makerVoiceAudio && typeof window !== 'undefined') {
      try {
        this.makerVoiceAudio = new Audio(`data:audio/mpeg;base64,${MAKER_VOICE_BASE64}`);
        this.makerVoiceAudio.preload = 'auto';
        this.makerVoiceAudio.load();
      } catch {}
    }

    if (
      fromUserGesture &&
      !this.makerVoiceLoadedOnGesture &&
      this.makerVoiceAudio &&
      Date.now() - this.lastMakerVoiceTime > 1200
    ) {
      try {
        this.makerVoiceAudio.load();
        this.makerVoiceLoadedOnGesture = true;
      } catch {}
    }
  }

  private playDecodedThrowPaperBuffer(buf: AudioBuffer) {
    if (!this.ctx) return;
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

  // تشغيل صوت رمي الورقة الجديد على الطاولة (throwpaper7.wav) مرة واحدة فقط لكل ورقة
  private lastThrowTime: number = 0;

  playCardThrow() {
    if (!this.enabled) return;
    const nowMs = Date.now();
    if (nowMs - this.lastThrowTime < 80) return;
    this.lastThrowTime = nowMs;

    this.init();

    const playWebAudio = () => {
      if (!this.ctx) return;
      if (this.throwPaperBuffer) {
        this.playDecodedThrowPaperBuffer(this.throwPaperBuffer);
      } else {
        this.decodeThrowPaperBuffer((buf) => this.playDecodedThrowPaperBuffer(buf));
      }
    };

    if (this.ctx && this.throwPaperBuffer && (this.ctx.state as string) === 'running') {
      this.playDecodedThrowPaperBuffer(this.throwPaperBuffer);
      return;
    }

    if (typeof window !== 'undefined') {
      try {
        if (!this.throwPaperAudio) {
          this.throwPaperAudio = new Audio(`data:audio/wav;base64,${THROW_PAPER_BASE64}`);
          this.throwPaperAudio.preload = 'auto';
        }
        const audio = this.throwPaperAudio;
        if (!audio.paused) {
          audio.pause();
        }
        if (audio.readyState >= 1) {
          try {
            audio.currentTime = 0;
          } catch {}
        }
        audio.muted = false;
        audio.volume = 1.0;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            if (err && err.name !== 'AbortError') {
              playWebAudio();
            }
          });
          return;
        }
      } catch {}
    }

    playWebAudio();
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
    if (!this.ctx) return;
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

  private playJokerWebAudioFallback() {
    if (!this.ctx) return;
    if (this.jokerVoiceBuffer) {
      this.playDecodedJokerBuffer(this.jokerVoiceBuffer);
      return;
    }
    this.decodeJokerBuffer((buf) => {
      this.playDecodedJokerBuffer(buf);
    });
  }

  private playDecodedMakerBuffer(buf: AudioBuffer) {
    if (!this.ctx) return;
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

  private playMakerWebAudioFallback() {
    if (!this.ctx) return;
    if (this.makerVoiceBuffer) {
      this.playDecodedMakerBuffer(this.makerVoiceBuffer);
      return;
    }
    this.decodeMakerBuffer((buf) => {
      this.playDecodedMakerBuffer(buf);
    });
  }

  private playDecodedSkipBuffer(buf: AudioBuffer) {
    if (!this.ctx) return;
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
    if (!this.ctx) return;
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

    // أولوية قصوى (0ms Latency): التشغيل الفوري من مخزن WebAudio المفكوك مسبقاً بالتزامن اللحظي مع حركة الكرت
    if (this.ctx && this.jokerVoiceBuffer && (this.ctx.state as string) === 'running') {
      this.playDecodedJokerBuffer(this.jokerVoiceBuffer);
      return;
    }

    if (typeof window !== 'undefined') {
      try {
        if (!this.jokerVoiceAudio) {
          this.jokerVoiceAudio = new Audio(`data:audio/mpeg;base64,${JOKER_VOICE_BASE64}`);
          this.jokerVoiceAudio.preload = 'auto';
        }
        const audio = this.jokerVoiceAudio;
        if (!audio.paused) {
          audio.pause();
        }
        if (audio.readyState >= 1) {
          try {
            audio.currentTime = 0;
          } catch {}
        }
        audio.muted = false;
        audio.volume = 1.0;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            if (err && err.name !== 'AbortError') {
              try {
                const urlAudio = new Audio(JOKER_AUDIO_URL);
                urlAudio.volume = 1.0;
                urlAudio.play().catch(() => {
                  this.playJokerWebAudioFallback();
                });
              } catch {
                this.playJokerWebAudioFallback();
              }
            }
          });
          return;
        }
      } catch {}
    }

    this.playJokerWebAudioFallback();
  }

  playMakerVoice() {
    if (!this.enabled) return;
    const nowMs = Date.now();
    if (nowMs - this.lastMakerVoiceTime < 250) return;
    this.lastMakerVoiceTime = nowMs;

    this.init();

    // أولوية قصوى (0ms Latency): التشغيل الفوري من مخزن WebAudio المفكوك مسبقاً بالتزامن اللحظي مع حركة كرت الميكر
    if (this.ctx && this.makerVoiceBuffer && (this.ctx.state as string) === 'running') {
      this.playDecodedMakerBuffer(this.makerVoiceBuffer);
      return;
    }

    if (typeof window !== 'undefined') {
      try {
        if (!this.makerVoiceAudio) {
          this.makerVoiceAudio = new Audio(`data:audio/mpeg;base64,${MAKER_VOICE_BASE64}`);
          this.makerVoiceAudio.preload = 'auto';
        }
        const audio = this.makerVoiceAudio;
        if (!audio.paused) {
          audio.pause();
        }
        if (audio.readyState >= 1) {
          try {
            audio.currentTime = 0;
          } catch {}
        }
        audio.muted = false;
        audio.volume = 1.0;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            if (err && err.name !== 'AbortError') {
              try {
                const urlAudio = new Audio(MAKER_AUDIO_URL);
                urlAudio.volume = 1.0;
                urlAudio.play().catch(() => {
                  this.playMakerWebAudioFallback();
                });
              } catch {
                this.playMakerWebAudioFallback();
              }
            }
          });
          return;
        }
      } catch {}
    }

    this.playMakerWebAudioFallback();
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

  // صوت عداد الوقت: هادئ ومريح في أول 15 ثانية، ويتغير إلى نغمة تنبيهية مميزة وواضحة في آخر 5 ثوانٍ
  playTimerTick(secondsLeft: number = 10) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    if ((this.ctx.state as string) !== 'running') {
      this.ctx.resume().catch(() => {});
    }

    const now = this.ctx.currentTime;
    const sec = Math.round(secondsLeft);
    const isUrgent = sec <= 5;

    if (!isUrgent) {
      // أول 15 ثانية: نغمة خشبية دافئة وهادئة تتناوب بين G4 (392Hz) و C5 (523.25Hz)
      const isEven = sec % 2 === 0;
      const baseFreq = isEven ? 392.0 : 523.25;
      const duration = 0.1;
      const peakGain = 0.05;

      const osc = this.ctx.createOscillator();
      const subOsc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.985, now + duration);

      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(baseFreq * 0.5, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1050, now);
      filter.Q.setValueAtTime(0.7, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(peakGain, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      const subGain = this.ctx.createGain();
      subGain.gain.setValueAtTime(peakGain * 0.35, now);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(filter);
      subOsc.connect(subGain);
      subGain.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      subOsc.start(now);
      osc.stop(now + duration + 0.01);
      subOsc.stop(now + duration + 0.01);
      return;
    }

    // آخر 5 ثوانٍ: نغمة تنبيه مزدوجة سريعة وواضحة تتصاعد حدتها مع كل ثانية (5 -> 1)
    const urgentFreqMap: Record<number, number> = {
      5: 880.0,     // A5
      4: 932.33,    // Bb5
      3: 987.77,    // B5
      2: 1046.5,    // C6
      1: 1174.66,   // D6
    };
    const baseFreq = urgentFreqMap[sec] || 987.77;
    const peakGain = 0.115;

    // نبضتان متتاليتان (Double-Beep) لتمييز آخر 5 ثوانٍ بوضوح تام
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
    if (this.skipAudios.length > 0) {
      this.skipAudios.forEach((a) => {
        try {
          a.pause();
          if (a.readyState >= 1) {
            a.currentTime = 0;
          }
        } catch {}
      });
    }
  }

  // تشغيل صوت "طاف" بتوزيع عشوائي من الأصوات المخصصة بدون تكرار نفس الصوت مرتين متتاليتين
  playRandomSkipVoice(specificIndex?: number): number {
    if (!this.enabled) return 0;
    this.init();
    this.stopSkipVoices();

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

    const playWebAudio = () => {
      if (!this.ctx) return;
      const existing = this.skipBuffers[idx];
      if (existing) {
        this.playDecodedSkipBuffer(existing);
      } else {
        this.decodeSkipBuffer(idx, (buf) => this.playDecodedSkipBuffer(buf));
      }
    };

    if (this.ctx && this.skipBuffers[idx] && (this.ctx.state as string) === 'running') {
      this.playDecodedSkipBuffer(this.skipBuffers[idx]!);
      return idx;
    }

    if (typeof window !== 'undefined') {
      try {
        if (this.skipAudios.length === 0) {
          this.skipAudios = activeSkipList.map((b64) => {
            const a = new Audio(toAudioDataUrl(b64));
            a.preload = 'auto';
            return a;
          });
        }
        const audio = this.skipAudios[idx];
        if (audio) {
          audio.pause();
          if (audio.readyState >= 1) {
            try {
              audio.currentTime = 0;
            } catch {}
          }
          audio.muted = false;
          audio.volume = 1.0;
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => {
              playWebAudio();
            });
            return idx;
          }
        }
      } catch {}
    }

    playWebAudio();
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
    if (this.activeApplauseSource) {
      try {
        this.activeApplauseSource.stop();
      } catch {}
      this.activeApplauseSource = null;
    }
    if (this.activeBaoonLossSource) {
      try {
        this.activeBaoonLossSource.stop();
      } catch {}
      this.activeBaoonLossSource = null;
    }
    if (this.applauseAudio) {
      try {
        this.applauseAudio.pause();
        if (this.applauseAudio.readyState >= 1) {
          this.applauseAudio.currentTime = 0;
        }
        this.applauseAudio.volume = 0.95;
      } catch {}
    }
    if (this.matchWinAudio) {
      try {
        this.matchWinAudio.pause();
        if (this.matchWinAudio.readyState >= 1) {
          this.matchWinAudio.currentTime = 0;
        }
        this.matchWinAudio.volume = 1.0;
      } catch {}
    }
    if (this.baoonLossAudio) {
      try {
        this.baoonLossAudio.pause();
        if (this.baoonLossAudio.readyState >= 1) {
          this.baoonLossAudio.currentTime = 0;
        }
        this.baoonLossAudio.volume = 1.0;
      } catch {}
    }
  }

  private playDecodedApplauseBuffer(buf: AudioBuffer, durationMs: number) {
    if (!this.ctx) return;
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

  // تشغيل الصوت المخصص عند خسارة الباون لأي فريق بدلاً من الصوت العادي
  playBaoonLossVoice() {
    if (!this.enabled) return;
    this.init();
    this.stopApplause();

    const playWebAudio = () => {
      if (!this.ctx) return;
      if (this.baoonLossBuffer) {
        this.playDecodedBaoonLossBuffer(this.baoonLossBuffer);
      } else {
        this.decodeBaoonLossBuffer((buf) => this.playDecodedBaoonLossBuffer(buf));
      }
    };

    if (this.ctx && this.baoonLossBuffer && (this.ctx.state as string) === 'running') {
      this.playDecodedBaoonLossBuffer(this.baoonLossBuffer);
      return;
    }

    if (typeof window !== 'undefined') {
      try {
        if (!this.baoonLossAudio) {
          this.baoonLossAudio = new Audio(`data:audio/mpeg;base64,${BAOON_LOSS_BASE64}`);
          this.baoonLossAudio.preload = 'auto';
        }
        const audio = this.baoonLossAudio;
        audio.pause();
        if (audio.readyState >= 1) {
          try {
            audio.currentTime = 0;
          } catch {}
        }
        audio.muted = false;
        audio.volume = 1.0;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            playWebAudio();
          });
          return;
        }
      } catch {}
    }

    playWebAudio();
  }

  // تشغيل صوت تصفيق واحتفال الفوز بالمباراة الكاملة عند ظهور النتيجة النهائية
  playMatchWinCelebration() {
    if (!this.enabled) return;
    try {
      this.stopApplause();
      if (!this.matchWinAudio && typeof window !== 'undefined') {
        this.matchWinAudio = new Audio('/winners_celebration.mp3');
        this.matchWinAudio.preload = 'auto';
      }
      if (!this.matchWinAudio) return;

      const audio = this.matchWinAudio;
      if (audio.readyState >= 1) {
        try {
          audio.currentTime = 0;
        } catch {}
      }
      audio.volume = 1.0;
      audio.play().catch(() => {});
    } catch {}
  }

  // تشغيل فوري (0ms) ومضبوط زمنياً لصوت التصفيق يبدأ لحظة ظهور "كفو شباب" ويتوقف لحظة اختفائها بالضبط
  playCheeringAndWhistle(durationMs: number = 2400) {
    if (!this.enabled) return;
    this.init();
    this.stopApplause();

    // أولوية قصوى (0ms Latency): التشغيل من WebAudio Buffer المفكوك مسبقاً بالتزامن اللحظي مع ظهور واختفاء "كفو شباب"
    if (this.ctx && this.applauseBuffer && (this.ctx.state as string) === 'running') {
      this.playDecodedApplauseBuffer(this.applauseBuffer, durationMs);
      return;
    }

    const playWebAudioFallback = () => {
      if (!this.ctx) return;
      if (this.applauseBuffer) {
        this.playDecodedApplauseBuffer(this.applauseBuffer, durationMs);
      } else {
        this.decodeApplauseBuffer((buf) => this.playDecodedApplauseBuffer(buf, durationMs));
      }
    };

    try {
      if (!this.applauseAudio && typeof window !== 'undefined') {
        this.applauseAudio = new Audio(`data:audio/mpeg;base64,${APPLAUSE_BASE64}`);
        this.applauseAudio.preload = 'auto';
      }
      if (!this.applauseAudio) {
        playWebAudioFallback();
        return;
      }

      const audio = this.applauseAudio;
      if (!audio.paused) {
        audio.pause();
      }
      if (audio.readyState >= 1) {
        try {
          audio.currentTime = 0;
        } catch {}
      }
      audio.muted = false;
      audio.volume = 0.95;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          playWebAudioFallback();
        });
      }

      const fadeStartMs = Math.max(400, durationMs - 220);
      this.applauseTimer = setTimeout(() => {
        this.applauseFadeInterval = setInterval(() => {
          if (audio.volume > 0.15) {
            audio.volume = Math.max(0, audio.volume - 0.22);
          } else {
            this.stopApplause();
          }
        }, 35);
      }, fadeStartMs);
    } catch {
      playWebAudioFallback();
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
