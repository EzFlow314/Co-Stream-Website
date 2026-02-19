import fs from "node:fs";
import path from "node:path";

type AssetEntry = { id: string; source: string; license: string; hash: string };

function readManifest(): AssetEntry[] {
  try {
    const file = path.join(process.cwd(), "public", "legal", "assets-manifest.json");
    return JSON.parse(fs.readFileSync(file, "utf8")) as AssetEntry[];
  } catch {
    return [];
  }
}

export default function LegalAssetsPage() {
  const manifest = readManifest();

  return (
    <main className="space-y-4">
      <h1 className="text-3xl font-black">Asset Licenses</h1>
      <p className="text-sm text-white/70">EzPlay uses local, license-safe assets only. No random hotlinks are used for production looks.</p>
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/20">
              <th className="p-2">Asset</th>
              <th className="p-2">Source</th>
              <th className="p-2">License</th>
              <th className="p-2">Hash</th>
            </tr>
          </thead>
          <tbody>
            {manifest.map((item) => (
              <tr key={item.id} className="border-b border-white/10">
                <td className="p-2">{item.id}</td>
                <td className="p-2">{item.source}</td>
                <td className="p-2">{item.license}</td>
                <td className="p-2 text-xs text-white/60">{item.hash}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
