export type AnnouncerTier = "LOW" | "MID" | "HIGH" | "LEGENDARY";
export type AnnouncerVibe = "STREET" | "ARENA" | "NEON" | "CHILL";
export type AddressingMode = "NEUTRAL_ONLY" | "PRONOUNS_OK" | "CUSTOM_NICKNAME";

export type AnnouncerIdentity = {
  participantId: string;
  pronouns?: string;
  announcerNickname?: string;
  announcerAddressingMode?: AddressingMode;
};

export type AnnouncerInput = {
  eventType: string;
  intensity: number;
  vibe: AnnouncerVibe;
  identity?: AnnouncerIdentity;
  familyMode?: boolean;
};

export type AnnouncerOutput = {
  calloutText: string;
  tier: AnnouncerTier;
  durationMs: number;
  styleId: string;
  sfxId?: string;
};

const FAMILY_PACK: Record<AnnouncerTier, string[]> = {
  LOW: ["NICE PLAY!", "SOLID MOVE!"],
  MID: ["BIG MOMENT!", "THAT WAS CLEAN!"],
  HIGH: ["CLUTCH PLAY!", "WHAT A TURN!"],
  LEGENDARY: ["LEGENDARY MOMENT!", "UNREAL PLAY!"]
};

const REGULAR_PACK: Record<AnnouncerVibe, Record<AnnouncerTier, string[]>> = {
  STREET: {
    LOW: ["CLEAN TOUCH", "SMART MOVE"],
    MID: ["COOKIN'", "RUN IT BACK"],
    HIGH: ["THAT'S ICE COLD", "CLUTCH!"],
    LEGENDARY: ["BLOCK PARTY ENERGY", "ALL-TIME CLIP"]
  },
  ARENA: {
    LOW: ["GOOD ROTATION", "SOLID EXECUTION"],
    MID: ["MOMENTUM BUILDING", "HIGH-PERCENTAGE PLAY"],
    HIGH: ["PLAYOFF CLUTCH", "BIG SWING"],
    LEGENDARY: ["CHAMPIONSHIP MOMENT", "BROADCAST CLASSIC"]
  },
  NEON: {
    LOW: ["NICE COMBO", "SMOOTH"],
    MID: ["POWER SURGE", "ARCade HEAT"],
    HIGH: ["MAX HYPE", "NEON CLUTCH"],
    LEGENDARY: ["COSMIC CLUTCH", "GALAXY MOMENT"]
  },
  CHILL: {
    LOW: ["GOOD FLOW", "STABLE PLAY"],
    MID: ["STRONG RHYTHM", "KEEP IT MOVING"],
    HIGH: ["CLEAN CLUTCH", "MOMENT SHIFT"],
    LEGENDARY: ["MASTERCLASS", "PEAK MOMENT"]
  }
};

export function tierForIntensity(intensity: number): AnnouncerTier {
  if (intensity >= 5) return "LEGENDARY";
  if (intensity >= 4) return "HIGH";
  if (intensity >= 3) return "MID";
  return "LOW";
}

function participantLabel(identity?: AnnouncerIdentity): string {
  if (!identity) return "PLAYER";
  if (identity.announcerAddressingMode === "CUSTOM_NICKNAME" && identity.announcerNickname) return identity.announcerNickname.toUpperCase();
  return identity.participantId.toUpperCase();
}

export function announcerEngine(input: AnnouncerInput): AnnouncerOutput {
  const tier = tierForIntensity(input.intensity);
  const pool = input.familyMode ? FAMILY_PACK[tier] : REGULAR_PACK[input.vibe][tier];
  const phrase = pool[Math.floor(Math.random() * pool.length)] || "BIG PLAY";
  const who = participantLabel(input.identity);
  return {
    calloutText: `${who}: ${phrase}`,
    tier,
    durationMs: tier === "LEGENDARY" ? 2200 : tier === "HIGH" ? 1500 : 1000,
    styleId: `${input.vibe.toLowerCase()}-${tier.toLowerCase()}`,
    sfxId: input.familyMode ? undefined : tier === "LEGENDARY" ? "legend-hit" : tier === "HIGH" ? "hype-hit" : undefined
  };
}
