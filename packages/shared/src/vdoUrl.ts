export type VdoPreset = "Smooth" | "Balanced" | "Sharp";

const PRESET_PARAMS: Record<VdoPreset, string> = {
  Smooth: "quality=2&fps=30",
  Balanced: "quality=3&fps=60",
  Sharp: "quality=4&fps=60"
};

export function buildVdoSenderUrl({ vdoId, preset }: { vdoId: string; preset: VdoPreset }) {
  const q = PRESET_PARAMS[preset];
  return `https://vdo.ninja/?push=${encodeURIComponent(vdoId)}&webcam&${q}&autostart=1&cleanoutput=1`;
}

export function buildVdoReceiverUrl({ vdoId, preset }: { vdoId: string; preset: VdoPreset }) {
  const q = PRESET_PARAMS[preset];
  return `https://vdo.ninja/?view=${encodeURIComponent(vdoId)}&solo&${q}&autostart=1&cleanoutput=1`;
}
