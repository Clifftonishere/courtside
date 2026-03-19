/**
 * PlayerDissection — AI-powered scouting report component
 * Ported from IRIS player-profile-generator.ts + player-profile-prompts.ts
 * Uses Claude API to generate traits, weaknesses, attributes, quotes
 */

import { useState, useEffect } from "react";
import { Zap, Shield, Brain, Activity, Target, TrendingDown, Quote } from "lucide-react";

interface DissectionProfile {
  identity: string;
  scoutingReport: string;
  traits: Array<{ category: string; label: string; editorial: string }>;
  weaknesses: Array<{ area: string; detail: string }>;
  scoutingQuotes: string[];
  attributes: {
    insideScoring: number;
    outsideScoring: number;
    playmaking: number;
    athleticism: number;
    defending: number;
    rebounding: number;
  };
  ovr: number;
  tendencies: Array<{
    playType: string;
    frequency: number;
    pointsPerPossession: number;
    percentile: number;
  }>;
  tags: string[];
}

const CATEGORY_COLORS: Record<string, { color: string; bg: string }> = {
  OFFENSE:      { color: "#F5A623", bg: "#F5A62315" },
  DEFENSE:      { color: "#C8102E", bg: "#C8102E15" },
  PLAYMAKING:   { color: "#1D428A", bg: "#1D428A15" },
  PHYSICALITY:  { color: "#008248", bg: "#00824815" },
  INTANGIBLES:  { color: "#888",    bg: "#88888815" },
  EXPLOITABLE:  { color: "#C8102E", bg: "#C8102E15" },
};

const ATTR_LABELS: { key: keyof DissectionProfile["attributes"]; label: string }[] = [
  { key: "insideScoring", label: "INSIDE" },
  { key: "outsideScoring", label: "OUTSIDE" },
  { key: "playmaking", label: "PLAYMAKING" },
  { key: "athleticism", label: "ATHLETICISM" },
  { key: "defending", label: "DEFENDING" },
  { key: "rebounding", label: "REBOUNDING" },
];

function AttributeBar({ label, value }: { label: string; value: number }) {
  const color = value >= 90 ? "#F5A623" : value >= 80 ? "#008248" : value >= 65 ? "#1D428A" : "#888";
  return (
    <div className="flex items-center gap-3">
      <div className="font-condensed font-bold text-[10px] uppercase tracking-[1px] text-white/40 w-[90px] flex-shrink-0">{label}</div>
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
      </div>
      <div className="font-mono font-bold text-[14px] w-8 text-right" style={{ color }}>{value}</div>
    </div>
  );
}

async function generateDissection(playerName: string, teamAbbr: string, pts: number, reb: number, ast: number): Promise<DissectionProfile> {
  const systemPrompt = `You are Caesar — the sharpest basketball mind on the planet. You're writing a definitive scouting dissection on an NBA player. Output MUST be valid JSON only — no markdown, no backticks, no preamble.

{
  "identity": "string (max 80 chars — THE defining sentence. Bold, editorial, memorable.)",
  "scoutingReport": "string (2-3 paragraphs, pure basketball editorial voice)",
  "traits": [
    { "category": "OFFENSE|DEFENSE|PLAYMAKING|PHYSICALITY|INTANGIBLES", "label": "string", "editorial": "string (1-2 sentences)" }
  ],
  "weaknesses": [
    { "area": "string (exploitable weakness label)", "detail": "string (HOW opponents exploit this — specific, actionable)" }
  ],
  "scoutingQuotes": ["string (3 quotes written as scouts talking about this player)"],
  "attributes": { "insideScoring": 0-99, "outsideScoring": 0-99, "playmaking": 0-99, "athleticism": 0-99, "defending": 0-99, "rebounding": 0-99 },
  "ovr": 0-99,
  "tendencies": [
    { "playType": "string", "frequency": 0-100, "pointsPerPossession": 1.0-1.3, "percentile": 0-99 }
  ],
  "tags": ["ASCENDING|BREAKOUT|CLUTCH|UNDERRATED|LOCKED-IN|DECLINING|FRANCHISE-CHANGER (pick 1-2)"]
}

OVR calibration: 97+=historic, 93-96=MVP-level, 88-92=All-Star, 82-87=starter, 75-81=rotation
Include 3-5 traits, 2-3 weaknesses, 3 scouting quotes, 3-5 tendencies.
Write with conviction. Be specific. No generic praise.`;

  const userPrompt = `Generate a scouting dissection for ${playerName} (${teamAbbr}).
Season averages: ${pts} PPG, ${reb} RPG, ${ast} APG.
Write as if you've studied every game film. Be specific about their game.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  const data = await response.json();
  const text = data.content?.find((c: any) => c.type === "text")?.text || "";
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

interface PlayerDissectionProps {
  playerName: string;
  teamAbbr: string;
  pts: number;
  reb: number;
  ast: number;
}

export function PlayerDissection({ playerName, teamAbbr, pts, reb, ast }: PlayerDissectionProps) {
  const [profile, setProfile] = useState<DissectionProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateDissection(playerName, teamAbbr, pts, reb, ast);
      setProfile(result);
      setGenerated(true);
    } catch (e) {
      setError("Failed to generate. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!generated) {
    return (
      <div className="bg-[#0D0D0D] border border-white/10 rounded-xl p-6 text-center">
        <div className="mb-3">
          <div className="font-condensed font-bold text-[11px] uppercase tracking-[2px] text-white/30 mb-1">Courtside AI</div>
          <div className="font-condensed font-bold text-[22px] text-white uppercase tracking-[1px]">Player Dissection</div>
          <p className="font-sans text-[13px] text-white/40 mt-2 max-w-[340px] mx-auto">
            Deep scouting report generated by AI — traits, tendencies, weaknesses, and the scout's eye view.
          </p>
        </div>
        <button onClick={generate}
          className="mt-4 font-condensed font-bold text-[13px] uppercase tracking-[2px] bg-[#1D428A] text-white px-6 py-3 rounded-sm hover:bg-[#163570] transition-colors">
          Generate Dissection
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-[#0D0D0D] border border-white/10 rounded-xl p-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-2 h-2 rounded-full bg-[#1D428A] animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 rounded-full bg-[#1D428A] animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 rounded-full bg-[#1D428A] animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
        <div className="font-condensed font-bold text-[12px] uppercase tracking-[2px] text-white/40">
          Generating dissection...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#0D0D0D] border border-white/10 rounded-xl p-6 text-center">
        <p className="font-sans text-[12px] text-[#C8102E] mb-3">{error}</p>
        <button onClick={generate} className="font-condensed font-bold text-[12px] uppercase tracking-[2px] border border-white/20 text-white/60 px-4 py-2 rounded-sm hover:border-white hover:text-white transition-all">
          Retry
        </button>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-condensed font-bold text-[10px] uppercase tracking-[2px] text-white/30 mb-1">Courtside Dissection</div>
          <div className="font-condensed font-bold text-[11px] uppercase tracking-[2px] text-white/30">DISSECTION</div>
        </div>
        <div className="flex items-center gap-2">
          {profile.tags.map(tag => (
            <span key={tag} className="font-condensed font-bold text-[9px] uppercase tracking-[1.5px] px-2 py-1 rounded-sm bg-[#1D428A] text-white">
              {tag}
            </span>
          ))}
          <div className="flex flex-col items-center bg-white/5 border border-white/10 rounded-sm px-3 py-1.5">
            <div className="font-mono font-bold text-[22px] text-[#F5A623] leading-none">{profile.ovr}</div>
            <div className="font-condensed font-bold text-[8px] uppercase tracking-[1px] text-white/30">OVR</div>
          </div>
        </div>
      </div>

      {/* Identity */}
      <div className="border-l-[3px] border-[#F5A623] pl-4 py-1">
        <p className="font-condensed font-bold text-[18px] text-white leading-snug">{profile.identity}</p>
      </div>

      {/* Scouting report */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-sm p-4">
        <p className="font-sans text-[13px] text-white/60 leading-relaxed whitespace-pre-line">{profile.scoutingReport}</p>
      </div>

      {/* Attributes */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-sm p-4">
        <div className="font-condensed font-bold text-[10px] uppercase tracking-[2px] text-white/30 mb-4">Attributes</div>
        <div className="space-y-3">
          {ATTR_LABELS.map(({ key, label }) => (
            <AttributeBar key={key} label={label} value={profile.attributes[key]} />
          ))}
        </div>
      </div>

      {/* Traits grid */}
      <div>
        <div className="font-condensed font-bold text-[10px] uppercase tracking-[2px] text-white/30 mb-3">Traits</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {profile.traits.map((trait, i) => {
            const cat = CATEGORY_COLORS[trait.category] || { color: "#888", bg: "#88888815" };
            return (
              <div key={i} className="bg-white/[0.04] border border-white/[0.07] rounded-sm p-4">
                <div className="font-condensed font-bold text-[9px] uppercase tracking-[1.5px] mb-1" style={{ color: cat.color }}>
                  {trait.category}
                </div>
                <div className="font-condensed font-bold text-[15px] text-white mb-1.5">{trait.label}</div>
                <p className="font-sans text-[12px] text-white/50 leading-relaxed">{trait.editorial}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weaknesses */}
      <div>
        <div className="font-condensed font-bold text-[10px] uppercase tracking-[2px] text-white/30 mb-3">Exploitable</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {profile.weaknesses.map((w, i) => (
            <div key={i} className="bg-[#C8102E]/[0.06] border border-[#C8102E]/20 rounded-sm p-4">
              <div className="font-condensed font-bold text-[9px] uppercase tracking-[1.5px] text-[#C8102E] mb-1">EXPLOITABLE</div>
              <div className="font-condensed font-bold text-[15px] text-white mb-1.5">{w.area}</div>
              <p className="font-sans text-[12px] text-white/50 leading-relaxed">{w.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tendencies */}
      <div>
        <div className="font-condensed font-bold text-[10px] uppercase tracking-[2px] text-white/30 mb-3">Tendencies</div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-sm overflow-hidden">
          <div className="grid grid-cols-4 bg-white/[0.04] border-b border-white/[0.06]">
            {["Play Type", "Freq %", "PPP", "Pctile"].map(h => (
              <div key={h} className="font-condensed font-bold text-[9px] uppercase tracking-[1px] text-white/30 py-2.5 px-3 text-center">{h}</div>
            ))}
          </div>
          {profile.tendencies.map((t, i) => {
            const pctColor = t.percentile >= 80 ? "#F5A623" : t.percentile >= 60 ? "#008248" : "#888";
            return (
              <div key={i} className={`grid grid-cols-4 ${i < profile.tendencies.length - 1 ? "border-b border-white/[0.05]" : ""} hover:bg-white/[0.02]`}>
                <div className="font-sans text-[12px] text-white/70 py-2.5 px-3">{t.playType}</div>
                <div className="font-mono text-[12px] text-white/60 py-2.5 px-3 text-center">{t.frequency}%</div>
                <div className="font-mono text-[12px] text-white/60 py-2.5 px-3 text-center">{t.pointsPerPossession.toFixed(2)}</div>
                <div className="font-mono font-bold text-[12px] py-2.5 px-3 text-center" style={{ color: pctColor }}>{t.percentile}th</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scout quotes */}
      <div>
        <div className="font-condensed font-bold text-[10px] uppercase tracking-[2px] text-white/30 mb-3">Scout's Eye</div>
        <div className="space-y-2">
          {profile.scoutingQuotes.map((quote, i) => (
            <div key={i} className="flex items-start gap-3 bg-white/[0.03] border border-white/[0.06] rounded-sm p-3">
              <Quote size={12} className="text-[#1D428A] flex-shrink-0 mt-0.5" />
              <p className="font-sans text-[13px] text-white/60 leading-relaxed italic">{quote}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Regenerate */}
      <button onClick={generate}
        className="font-condensed font-bold text-[10px] uppercase tracking-[2px] text-white/20 hover:text-white/50 transition-colors">
        ↻ Regenerate Dissection
      </button>
    </div>
  );
}
