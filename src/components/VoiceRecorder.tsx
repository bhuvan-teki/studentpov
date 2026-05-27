import { useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2 } from "lucide-react";

export function VoiceRecorder({
  onRecorded,
  onClear,
  hasClip,
}: {
  onRecorded: (blob: Blob) => void;
  onClear: () => void;
  hasClip: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
    mediaRef.current?.stream.getTracks().forEach((t) => t.stop());
  }, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        onRecorded(blob);
      };
      rec.start();
      mediaRef.current = rec;
      setRecording(true);
      setElapsed(0);
      timer.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch {
      alert("Microphone access denied");
    }
  };

  const stop = () => {
    mediaRef.current?.stop();
    setRecording(false);
    if (timer.current) clearInterval(timer.current);
  };

  if (hasClip) {
    return (
      <button
        type="button"
        onClick={onClear}
        className="h-8 px-2.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-[11px] text-foreground/80 flex items-center gap-1.5 border border-white/[0.06]"
      >
        <Trash2 className="h-3 w-3" /> Remove voice
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={recording ? stop : start}
      className={`h-8 px-2.5 rounded-md text-[11px] flex items-center gap-1.5 border transition ${
        recording
          ? "bg-red-500/15 border-red-500/30 text-red-300"
          : "bg-white/[0.03] border-white/[0.06] text-foreground/80 hover:bg-white/[0.06]"
      }`}
    >
      {recording ? (
        <>
          <Square className="h-3 w-3 fill-current" />
          {String(Math.floor(elapsed / 60)).padStart(2, "0")}:
          {String(elapsed % 60).padStart(2, "0")}
        </>
      ) : (
        <>
          <Mic className="h-3 w-3" /> Record
        </>
      )}
    </button>
  );
}
