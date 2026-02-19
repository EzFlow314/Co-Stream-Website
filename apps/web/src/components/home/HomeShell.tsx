"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BRAND } from "@/src/config/brand";
import { useThemeSettings } from "@/components/theme-provider";
import { THEME_PRESETS } from "@/src/theme/themes";
import { EzButton } from "@/src/components/ui/EzButton";
import styles from "./HomeShell.module.css";
import { useMemo, useState } from "react";

const gradientFallback = "linear-gradient(180deg, rgb(var(--ez-bg0)), rgb(var(--ez-bg1)))";

export function HomeShell() {
  const { hostThemeId, reducedMotion, highContrast, obsSafeDefault } = useThemeSettings();
  const theme = THEME_PRESETS[hostThemeId];
  const home = theme.home;
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  const labels = {
    start: home?.labelCase === "upper" ? "START THE LOBBY" : "Start the Lobby",
    pull: home?.labelCase === "upper" ? "PULL UP" : "Pull Up",
    obs: home?.labelCase === "upper" ? "LOAD INTO OBS" : "Load into OBS"
  };

  const onMove = (event: React.MouseEvent<HTMLElement>) => {
    if (reducedMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = (event.clientX - rect.left) / rect.width - 0.5;
    const dy = (event.clientY - rect.top) / rect.height - 0.5;
    setParallax({ x: dx * 8, y: dy * 8 });
  };

  const rootStyle = useMemo(() => ({
    ["--ez-home-glow" as string]: String(home?.glowStrength ?? 0.3),
    ["--parallax-x" as string]: `${parallax.x}px`,
    ["--parallax-y" as string]: `${parallax.y}px`
  }), [home?.glowStrength, parallax.x, parallax.y]);

  const body = (
    <main className={styles.root} style={rootStyle} onMouseMove={onMove}>
      <div className={styles.bg} style={{ backgroundImage: home?.bgImage ? `url(${home.bgImage}), ${gradientFallback}` : gradientFallback }} />
      <div className={styles.vignette} />
      <div className={styles.overlay} style={{ background: home?.bgOverlay || "linear-gradient(180deg, rgb(0 0 0 / .25), rgb(0 0 0 / .55))" }} />
      <div className={styles.spotlight} />
      {!highContrast && !obsSafeDefault && (
        <div className={styles.grain} style={{ opacity: home?.grainOpacity ?? 0.1, backgroundImage: `url('/skins/home/grain.svg')` }} />
      )}

      <div className={styles.wrap}>
        <header className={`${styles.header} ${home?.headerStyle === "poster" ? styles.poster : home?.headerStyle === "neon" ? styles.neon : styles.pro}`}>
          <h1 className="text-6xl font-black tracking-wider">{BRAND.name}</h1>
          <p className="muted">{BRAND.tagline}</p>
        </header>

        <div className={styles.stack}>
          <Link href="/room/new"><EzButton variant="primary" styleKind={home?.buttonStyle || "proFrame"} className="w-full">{labels.start}</EzButton></Link>
          <Link href="/join"><EzButton variant="primary" styleKind={home?.buttonStyle || "proFrame"} className="w-full">{labels.pull}</EzButton></Link>
          <Link href="/help/obs"><EzButton variant="primary" styleKind={home?.buttonStyle || "proFrame"} className="w-full">{labels.obs}</EzButton></Link>
        </div>

        <div className={styles.row}>
          <Link href="/settings/themes"><EzButton variant="secondary" styleKind={home?.buttonStyle || "proFrame"}>Settings</EzButton></Link>
          <Link href="/dashboard"><EzButton variant="secondary" styleKind={home?.buttonStyle || "proFrame"}>Pro Mode</EzButton></Link>
        </div>
      </div>
    </main>
  );

  if (reducedMotion) return body;
  return <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>{body}</motion.div>;
}
