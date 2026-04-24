import { Platform } from "react-native";

export type VoiceSupport = "full" | "playback-only" | "none";

export function voiceSupport(): VoiceSupport {
  if (Platform.OS !== "web") return "none";
  if (typeof navigator === "undefined" || !navigator.mediaDevices) return "playback-only";
  if (typeof MediaRecorder === "undefined") return "playback-only";
  return "full";
}

export interface ActiveRecorder {
  stop: () => Promise<{ blob: Blob; mime: string }>;
  cancel: () => void;
}

export async function startRecording(): Promise<ActiveRecorder> {
  if (voiceSupport() !== "full") {
    throw new Error("Microphone is not available in this preview. Try the web preview.");
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  const mime =
    candidates.find((c) =>
      typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported
        ? MediaRecorder.isTypeSupported(c)
        : false,
    ) ?? "audio/webm";
  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(stream, { mimeType: mime });
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };
  recorder.start();

  let stopped = false;
  const stop = () =>
    new Promise<{ blob: Blob; mime: string }>((resolve) => {
      stopped = true;
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: mime });
        resolve({ blob, mime });
      };
      if (recorder.state !== "inactive") recorder.stop();
    });
  const cancel = () => {
    if (stopped) return;
    stream.getTracks().forEach((t) => t.stop());
    if (recorder.state !== "inactive") recorder.stop();
  };
  return { stop, cancel };
}

let currentAudio: HTMLAudioElement | null = null;

export function playUrl(url: string, onEnded?: () => void): void {
  if (Platform.OS !== "web" || typeof Audio === "undefined") {
    onEnded?.();
    return;
  }
  stopPlayback();
  const a = new Audio(url);
  currentAudio = a;
  a.onended = () => {
    onEnded?.();
    if (currentAudio === a) currentAudio = null;
  };
  a.onerror = () => {
    onEnded?.();
    if (currentAudio === a) currentAudio = null;
  };
  a.play().catch(() => {
    onEnded?.();
  });
}

export function stopPlayback(): void {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch {
      // ignore
    }
    currentAudio = null;
  }
}
