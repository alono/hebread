import { useCallback, useEffect, useRef } from 'react';
import { audioText, audioUrl } from '../audio/manifest';

/**
 * Plays prebuilt MP3s for content ids, with preload for the current round and a
 * speechSynthesis (he-IL) fallback when a clip is missing or fails to load
 * (PRD §6). All playback is user-initiated (taps), so autoplay policies are met.
 */
export function useAudio() {
  const currentRef = useRef<HTMLAudioElement | null>(null);
  const cacheRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const speakFallback = useCallback((id: string) => {
    const text = audioText(id);
    if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'he-IL';
    const heVoice = window.speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith('he'));
    if (heVoice) utter.voice = heVoice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }, []);

  const getAudio = useCallback((id: string): HTMLAudioElement | undefined => {
    let audio = cacheRef.current.get(id);
    if (!audio) {
      const url = audioUrl(id);
      if (!url) return undefined;
      audio = new Audio(url);
      audio.preload = 'auto';
      cacheRef.current.set(id, audio);
    }
    return audio;
  }, []);

  const stop = useCallback(() => {
    const audio = currentRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  const preload = useCallback(
    (ids: string[]) => {
      for (const id of ids) getAudio(id)?.load();
    },
    [getAudio],
  );

  const play = useCallback(
    (id: string) => {
      stop();
      const audio = getAudio(id);
      if (!audio) {
        speakFallback(id);
        return;
      }
      currentRef.current = audio;
      audio.currentTime = 0;
      const p = audio.play();
      if (p && typeof p.catch === 'function') p.catch(() => speakFallback(id));
    },
    [getAudio, speakFallback, stop],
  );

  useEffect(() => () => stop(), [stop]);

  return { play, preload, stop };
}
