"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEYS = {
  camera: "ezplay:selectedCameraId",
  mic: "ezplay:selectedMicId"
} as const;

function toUserMessage(error: unknown) {
  const name = typeof error === "object" && error && "name" in error ? String((error as { name?: unknown }).name) : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "Camera/Mic permission is blocked. Allow access in your browser site settings.";
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return "No camera or microphone was found. Plug in a device and refresh.";
  if (name === "NotReadableError" || name === "TrackStartError") return "Your camera or microphone is busy in another app. Close that app and try again.";
  return "Could not access camera/microphone. Check permissions and device availability.";
}

export function DeviceCheckPanel() {
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [selectedMicId, setSelectedMicId] = useState("");
  const [error, setError] = useState("");
  const [micLevel, setMicLevel] = useState(0);
  const [testingMic, setTestingMic] = useState(false);
  const [testingCamera, setTestingCamera] = useState(false);

  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const hasMedia = typeof navigator !== "undefined" && !!navigator.mediaDevices;

  const stopMicTest = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setTestingMic(false);
    setMicLevel(0);
  }, []);

  const stopCameraTest = useCallback(() => {
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
    if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null;
    setTestingCamera(false);
  }, []);

  const loadDevices = useCallback(async () => {
    if (!hasMedia) {
      setError("Media devices are not available in this browser.");
      return;
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices.filter((d) => d.kind === "videoinput");
      const audio = devices.filter((d) => d.kind === "audioinput");
      setCameras(cams);
      setMics(audio);

      setSelectedCameraId((current) => current || localStorage.getItem(STORAGE_KEYS.camera) || cams[0]?.deviceId || "");
      setSelectedMicId((current) => current || localStorage.getItem(STORAGE_KEYS.mic) || audio[0]?.deviceId || "");
      setError("");
    } catch (err) {
      setError(toUserMessage(err));
    }
  }, [hasMedia]);

  useEffect(() => {
    void loadDevices();
    return () => {
      stopMicTest();
      stopCameraTest();
    };
  }, [loadDevices, stopCameraTest, stopMicTest]);

  useEffect(() => {
    if (!selectedCameraId) return;
    localStorage.setItem(STORAGE_KEYS.camera, selectedCameraId);
  }, [selectedCameraId]);

  useEffect(() => {
    if (!selectedMicId) return;
    localStorage.setItem(STORAGE_KEYS.mic, selectedMicId);
  }, [selectedMicId]);

  async function requestPermissions() {
    if (!hasMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach((t) => t.stop());
      await loadDevices();
      setError("");
    } catch (err) {
      setError(toUserMessage(err));
    }
  }

  async function startCameraTest() {
    if (!hasMedia) return;
    stopCameraTest();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: selectedCameraId ? { deviceId: { exact: selectedCameraId } } : true,
        audio: false
      });
      cameraStreamRef.current = stream;
      if (cameraVideoRef.current) cameraVideoRef.current.srcObject = stream;
      setTestingCamera(true);
      setError("");
    } catch (err) {
      setError(toUserMessage(err));
    }
  }

  async function startMicTest() {
    if (!hasMedia) return;
    stopMicTest();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: selectedMicId ? { deviceId: { exact: selectedMicId } } : true,
        video: false
      });
      micStreamRef.current = stream;
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);

      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i += 1) {
          const centered = (data[i] ?? 128) - 128;
          sum += centered * centered;
        }
        const rms = Math.sqrt(sum / data.length);
        setMicLevel(Math.min(100, Math.round((rms / 128) * 170)));
        rafRef.current = requestAnimationFrame(tick);
      };
      setTestingMic(true);
      setError("");
      tick();
    } catch (err) {
      setError(toUserMessage(err));
    }
  }

  const cameraLabel = useMemo(() => cameras.find((d) => d.deviceId === selectedCameraId)?.label || "Default camera", [cameras, selectedCameraId]);
  const micLabel = useMemo(() => mics.find((d) => d.deviceId === selectedMicId)?.label || "Default microphone", [mics, selectedMicId]);

  return (
    <section className="ez-card space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-black">Devices (Camera + Mic)</h3>
        <button className="ez-btn ez-btn-muted" onClick={() => void loadDevices()}>Refresh</button>
      </div>

      <p className="text-xs text-white/70">Pick devices for local testing in Studio. Selections are saved in this browser.</p>

      <div className="space-y-2">
        <label className="text-xs text-white/70">Camera</label>
        <select className="ez-input" value={selectedCameraId} onChange={(e) => setSelectedCameraId(e.target.value)}>
          <option value="">Default camera</option>
          {cameras.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${device.deviceId.slice(0, 6)}`}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-white/70">Microphone</label>
        <select className="ez-input" value={selectedMicId} onChange={(e) => setSelectedMicId(e.target.value)}>
          <option value="">Default microphone</option>
          {mics.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>{device.label || `Mic ${device.deviceId.slice(0, 6)}`}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className="ez-btn ez-btn-primary" onClick={() => void startCameraTest()}>{testingCamera ? "Restart Camera Test" : "Test Camera"}</button>
        <button className="ez-btn ez-btn-muted" onClick={stopCameraTest} disabled={!testingCamera}>Stop Camera</button>
      </div>
      <video ref={cameraVideoRef} autoPlay muted playsInline className="h-28 w-full rounded bg-black" />
      <p className="text-xs text-white/60">Camera preview: {cameraLabel}</p>

      <div className="flex flex-wrap gap-2">
        <button className="ez-btn ez-btn-primary" onClick={() => void startMicTest()}>{testingMic ? "Restart Mic Test" : "Test Mic"}</button>
        <button className="ez-btn ez-btn-muted" onClick={stopMicTest} disabled={!testingMic}>Stop Mic</button>
      </div>
      <div className="h-3 rounded bg-white/10">
        <div className="h-full rounded bg-emerald-400 transition-all" style={{ width: `${micLevel}%` }} />
      </div>
      <p className="text-xs text-white/60">Mic input: {micLabel} · level {micLevel}%</p>

      {error && <p className="rounded border border-rose-400/40 bg-rose-500/10 p-2 text-sm">{error}</p>}
      {!error && (cameras.length === 0 || mics.length === 0) && (
        <div className="rounded border border-amber-300/40 bg-amber-400/10 p-2 text-sm space-y-2">
          <p>Device labels may be hidden until you grant browser permissions.</p>
          <button className="ez-btn ez-btn-muted" onClick={() => void requestPermissions()}>Grant Camera + Mic Permissions</button>
        </div>
      )}
    </section>
  );
}
