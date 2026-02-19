"use client";

import { BRAND } from "@/src/config/brand";

const OBS_SETTINGS = `Width: 1920\nHeight: 1080\nFPS: 60\nShutdown source when not visible: OFF\nRefresh browser when scene becomes active: ON\nControl audio via OBS: ON`;

export default function ObsHelpPage() {
  return (
    <main className="space-y-4">
      <h1 className="text-3xl font-black">Load {BRAND.name} into OBS</h1>
      <div className="ez-card space-y-2">
        <ol className="list-decimal space-y-1 pl-6">
          <li>In OBS, add Browser Source.</li>
          <li>Paste your Program Output URL from lobby/studio.</li>
          <li>Use 1920x1080 or append `?res=720` for 1280x720 scaling.</li>
          <li>Enable refresh on scene active and OBS audio control.</li>
        </ol>
        <pre className="ez-card !p-3 text-sm">{OBS_SETTINGS}</pre>
        <button className="ez-btn ez-btn-primary" onClick={() => navigator.clipboard.writeText(OBS_SETTINGS)}>Copy Browser Source Settings</button>
      </div>
    </main>
  );
}
