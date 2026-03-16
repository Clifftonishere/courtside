/**
 * TeamLogo — NBA team logo from CDN
 * Falls back to colored abbreviation badge if image fails
 */

import { useState } from "react";

// Team primary colors for fallback
const TEAM_COLORS: Record<string, { primary: string; text: string }> = {
  ATL: { primary: "#C8102E", text: "#fff" },
  BOS: { primary: "#007A33", text: "#fff" },
  BKN: { primary: "#000000", text: "#fff" },
  CHA: { primary: "#1D1160", text: "#fff" },
  CHI: { primary: "#CE1141", text: "#fff" },
  CLE: { primary: "#860038", text: "#FDBB30" },
  DAL: { primary: "#00538C", text: "#fff" },
  DEN: { primary: "#0E2240", text: "#FEC524" },
  DET: { primary: "#C8102E", text: "#006BB6" },
  GSW: { primary: "#1D428A", text: "#FFC72C" },
  HOU: { primary: "#CE1141", text: "#fff" },
  IND: { primary: "#002D62", text: "#FDBB30" },
  LAC: { primary: "#C8102E", text: "#1D428A" },
  LAL: { primary: "#552583", text: "#FDB927" },
  MEM: { primary: "#5D76A9", text: "#12173F" },
  MIA: { primary: "#98002E", text: "#F9A01B" },
  MIL: { primary: "#00471B", text: "#EEE1C6" },
  MIN: { primary: "#0C2340", text: "#236192" },
  NOP: { primary: "#0C2340", text: "#85714D" },
  NYK: { primary: "#006BB6", text: "#F58426" },
  OKC: { primary: "#007AC1", text: "#EF3B24" },
  ORL: { primary: "#0077C0", text: "#C4CED4" },
  PHI: { primary: "#006BB6", text: "#ED174C" },
  PHX: { primary: "#1D1160", text: "#E56020" },
  POR: { primary: "#E03A3E", text: "#fff" },
  SAC: { primary: "#5A2D81", text: "#63727A" },
  SAS: { primary: "#C4CED4", text: "#000" },
  TOR: { primary: "#CE1141", text: "#000" },
  UTA: { primary: "#002B5C", text: "#F9A01B" },
  WAS: { primary: "#002B5C", text: "#E31837" },
};

interface TeamLogoProps {
  abbr: string;
  teamId: number;
  size?: number;
  className?: string;
}

export function TeamLogo({
  abbr,
  teamId,
  size = 32,
  className = "",
}: TeamLogoProps) {
  const [imgError, setImgError] = useState(false);
  const colors = TEAM_COLORS[abbr] || { primary: "#1D428A", text: "#fff" };

  if (imgError || !teamId) {
    return (
      <div
        className={`flex items-center justify-center rounded-full font-condensed font-bold ${className}`}
        style={{
          width: size,
          height: size,
          background: colors.primary,
          color: colors.text,
          fontSize: size * 0.35,
          flexShrink: 0,
        }}
      >
        {abbr.slice(0, 2)}
      </div>
    );
  }

  return (
    <img
      src={`https://cdn.nba.com/logos/nba/${teamId}/primary/L/logo.svg`}
      alt={abbr}
      width={size}
      height={size}
      className={`object-contain ${className}`}
      style={{ flexShrink: 0 }}
      onError={() => setImgError(true)}
    />
  );
}

interface PlayerHeadshotProps {
  playerId: number | string;
  playerName: string;
  size?: number;
  className?: string;
}

export function PlayerHeadshot({
  playerId,
  playerName,
  size = 32,
  className = "",
}: PlayerHeadshotProps) {
  const [imgError, setImgError] = useState(false);
  const initials = playerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (imgError || !playerId) {
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-[#1D428A] text-white font-condensed font-bold ${className}`}
        style={{
          width: size,
          height: size,
          fontSize: size * 0.35,
          flexShrink: 0,
        }}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png`}
      alt={playerName}
      width={size}
      height={size}
      className={`object-cover rounded-full ${className}`}
      style={{ flexShrink: 0 }}
      onError={() => setImgError(true)}
    />
  );
}
