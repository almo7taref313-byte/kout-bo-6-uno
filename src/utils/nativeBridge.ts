import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';

/**
 * Native bridge utilities for Android and iOS devices.
 * Gracefully fall back on standard web browsers without throwing errors.
 */
class NativeBridgeManager {
  private isInitialized = false;

  public async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    if (Capacitor.isNativePlatform()) {
      try {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#070c14' });
      } catch (e) {
        console.warn('Native status bar init notice:', e);
      }
    }
  }

  /**
   * Haptic vibration feedback for card play
   */
  public async hapticCardPlay() {
    try {
      if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Light });
      } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(18);
      }
    } catch {}
  }

  /**
   * Haptic feedback when winning a trick
   */
  public async hapticTrickWin() {
    try {
      if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([25, 40, 25]);
      }
    } catch {}
  }

  /**
   * Haptic fanfare feedback when winning a round or match
   */
  public async hapticVictory() {
    try {
      if (Capacitor.isNativePlatform()) {
        await Haptics.notification({ type: NotificationType.Success });
      } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([40, 60, 40, 60, 100]);
      }
    } catch {}
  }
}

export const nativeBridge = new NativeBridgeManager();
