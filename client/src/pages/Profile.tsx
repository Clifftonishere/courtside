import { useState } from "react";
import { User, Bell, Plus, X, Twitter, Instagram, Star, TrendingUp, CheckCircle, XCircle } from "lucide-react";
import { ACTIVE_MARKETS, RESOLVED_MARKETS, LEADERBOARD, type ConfTier } from "@/lib/mock-data";
import { TeamLogo, PlayerHeadshot } from "@/components/TeamLogo";
import { PollCard } from "@/components/PollCard";

const NBA_TEAM_IDS: Record<string, number> = {
  ATL: 1610612737, BOS: 1610612738, BKN: 1610612751, CHA: 1610612766,
  CHI: 1610612741, CLE: 1610612739, DAL: 1610612742, DEN: 1610612743,
  DET: 1610612765, GSW: 1610612744, HOU: 1610612745, IND: 1610612754,
  LAC: 1610612746, LAL: 1610612747, MEM: 1610612763, MIA: 1610612748,
  MIL: 1610612749, MIN: 1610612750, NOP: 1610612740, NYK: 1610612752,
  OKC: 1610612760, ORL: 1610612753, PHI: 1610612755, PHX: 1610612756,
  POR: 1610612757, SAC: 1610612758, SAS: 1610612759, TOR: 1610612761,
  UTA: 1610612762, WAS: 1610612764,
};

const ALL_TEAMS = Object.keys(NBA_TEAM_IDS);

const FAVOURITE_PLAYERS = [
  { name: "Nikola Jokic", team: "DEN", playerId: 203999 },
  { name: "Anthony Edwards", team: "MIN", playerId: 1630162 },
];

const TIER_STYLES: Record<string, { color: string; label: string }> = {
  "Courtside": { color: "#F5A623", label: "COURTSIDE" },
  "Floor Seat": { color: "#CCC", label: "FLOOR SEAT" },
  "Lower Bowl": { color: "#CD7F32", label: "LOWER BOWL" },
  "Upper Deck": { color: "#888", label: "UPPER DECK" },
};

// Mock user profile
const USER = {
  name: "Cliffton Lee",
  username: "ClifftonLee",
  email: "cliff@example.com",
  twitter: "@clifftonlee",
  instagram: "@clifftonlee",
  points: 612,
  rank: 7,
  accuracy: 60,
  streak: "W3",
  tier: "Lower Bowl",
  totalPicks: 54,
  wins: 32,
  losses: 22,
};

const MY_CALLS = [
  { ...RESOLVED_MARKETS[0], myVote: "agree", status: "resolved" },
  { ...RESOLVED_MARKETS[1], myVote: "agree", status: "resolved" },
  { ...RESOLVED_MARKETS[2], myVote: "fade", status: "resolved" },
];

type ProfileTab = "overview" | "live" | "resolved";

export function Profile() {
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [favTeams, setFavTeams] = useState<string[]>(["DEN", "NYK"]);
  const [favPlayers, setFavPlayers] = useState(FAVOURITE_PLAYERS);
  const [showTeamPicker, setShowTeamPicker] = useState(false);
  const [editing, setEditing] = useState(false);

  const tierStyle = TIER_STYLES[USER.tier] || { color: "#888", label: "UPPER DECK" };
  const streakWin = USER.streak.startsWith("W");
  const myRankEntry = LEADERBOARD.find(e => e.rank === USER.rank);

  const removeTeam = (abbr: string) => setFavTeams(favTeams.filter(t => t !== abbr));
  const addTeam = (abbr: string) => { if (!favTeams.includes(abbr)) setFavTeams([...favTeams, abbr]); setShowTeamPicker(false); };
  const removePlayer = (name: string) => setFavPlayers(favPlayers.filter(p => p.name !== name));

  return (
    <div className="min-h-screen bg-white">

      {/* Hero */}
      <div className="bg-[#111] border-b border-[#222]">
        <div className="max-w-[1100px] mx-auto px-4 py-6">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-[#1D428A] flex items-center justify-center flex-shrink-0">
              <span className="font-condensed font-bold text-[32px] text-white uppercase tracking-[2px]">
                {USER.name.split(" ").map(n => n[0]).join("")}
              </span>
            </div>

            {/* Name + info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h1 className="font-condensed font-bold text-[48px] text-white uppercase leading-none tracking-[2px]">{USER.name}</h1>
                <span className="font-condensed font-bold text-[12px] uppercase tracking-[2px] px-3 py-1.5 rounded-sm border"
                  style={{ color: tierStyle.color, background: `${tierStyle.color}20`, borderColor: `${tierStyle.color}60` }}>
                  {tierStyle.label}
                </span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-condensed font-bold text-[14px] text-white/50 tracking-[1px] uppercase">@{USER.username}</span>
                {USER.twitter && (
                  <a href={`https://twitter.com/${USER.twitter.replace('@','')}`} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 font-mono text-[11px] text-white/40 hover:text-white transition-colors">
                    <Twitter size={11} />{USER.twitter}
                  </a>
                )}
                {USER.instagram && (
                  <a href="#" className="flex items-center gap-1 font-mono text-[11px] text-white/40 hover:text-white transition-colors">
                    <Instagram size={11} />{USER.instagram}
                  </a>
                )}
              </div>
            </div>

            <button onClick={() => setEditing(!editing)}
              className="font-condensed font-bold text-[12px] uppercase tracking-[2px] border border-[#444] text-[#888] px-4 py-2 rounded-sm hover:border-white hover:text-white transition-all flex-shrink-0">
              {editing ? "Save" : "Edit Profile"}
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-5 gap-3 mt-6">
            {[
              { label: "PTS", value: USER.points, color: "#F5A623" },
              { label: "RANK", value: `#${USER.rank}`, color: "#F5A623" },
              { label: "ACC", value: `${USER.accuracy}%`, color: "#008248" },
              { label: "STREAK", value: USER.streak, color: streakWin ? "#008248" : "#C8102E" },
              { label: "RECORD", value: `${USER.wins}-${USER.losses}`, color: "#1D428A" },
            ].map((s) => (
              <div key={s.label} className="text-center bg-white/5 rounded-lg py-4 px-2">
                <div className="font-mono font-bold text-[30px] leading-none" style={{ color: s.color }}>{s.value}</div>
                <div className="font-condensed font-bold text-[10px] uppercase text-white/40 tracking-[2px] mt-1.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#E0E0E0] bg-white">
        <div className="max-w-[1100px] mx-auto px-4">
          <div className="flex gap-0">
            {[
              { key: "overview" as ProfileTab, label: "Overview" },
              { key: "live" as ProfileTab, label: "Live Calls" },
              { key: "resolved" as ProfileTab, label: "Resolved" },
            ].map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 font-condensed font-bold text-[12px] uppercase tracking-[0.5px] border-b-2 transition-colors ${
                  activeTab === tab.key ? "border-[#1D428A] text-[#1D428A]" : "border-transparent text-[#888] hover:text-[#444]"
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1100px] mx-auto px-4 py-6">

        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left: teams + players */}
            <div className="lg:col-span-2 space-y-6">

              {/* Favourite Teams */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Star size={13} className="text-[#F5A623]" />
                    <span className="font-condensed font-bold text-[15px] uppercase text-[#111] tracking-[2px]">Favourite Teams</span>
                  </div>
                  <button onClick={() => setShowTeamPicker(!showTeamPicker)}
                    className="flex items-center gap-1 font-condensed font-bold text-[11px] uppercase text-[#1D428A] border border-[#1D428A] px-2 py-1 rounded-sm hover:bg-[#1D428A] hover:text-white transition-all tracking-[0.5px]">
                    <Plus size={11} /> Add Team
                  </button>
                </div>

                {showTeamPicker && (
                  <div className="mb-3 bg-white border border-[#E0E0E0] rounded-lg p-3 shadow-md">
                    <div className="flex flex-wrap gap-2">
                      {ALL_TEAMS.filter(t => !favTeams.includes(t)).map(abbr => (
                        <button key={abbr} onClick={() => addTeam(abbr)}
                          className="flex items-center gap-1.5 font-condensed font-bold text-[11px] uppercase border border-[#E0E0E0] px-2 py-1.5 rounded-sm hover:border-[#1D428A] hover:text-[#1D428A] transition-all tracking-[0.5px]">
                          <TeamLogo abbr={abbr} teamId={NBA_TEAM_IDS[abbr] || 0} size={16} />
                          {abbr}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  {favTeams.map(abbr => (
                    <div key={abbr} className="flex items-center gap-2 bg-white border border-[#E0E0E0] rounded-lg px-3 py-2.5 group">
                      <TeamLogo abbr={abbr} teamId={NBA_TEAM_IDS[abbr] || 0} size={32} />
                      <div>
                        <div className="font-condensed font-bold text-[15px] text-[#111] uppercase tracking-[1px]">{abbr}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Bell size={9} className="text-[#008248]" />
                          <span className="font-mono text-[9px] text-[#008248]">Notified</span>
                        </div>
                      </div>
                      <button onClick={() => removeTeam(abbr)} className="ml-2 text-[#CCC] hover:text-[#888] opacity-0 group-hover:opacity-100 transition-all">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              {/* Favourite Players */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Star size={13} className="text-[#F5A623]" />
                  <span className="font-condensed font-bold text-[15px] uppercase text-[#111] tracking-[2px]">Favourite Players</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {favPlayers.map(p => (
                    <div key={p.name} className="flex items-center gap-2.5 bg-white border border-[#E0E0E0] rounded-lg px-3 py-2.5 group">
                      <PlayerHeadshot playerId={p.playerId} playerName={p.name} size={36} />
                      <div>
                        <div className="font-sans font-semibold text-[12px] text-[#111]">{p.name}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Bell size={9} className="text-[#008248]" />
                          <span className="font-mono text-[9px] text-[#008248]">Notified</span>
                        </div>
                      </div>
                      <button onClick={() => removePlayer(p.name)} className="ml-1 text-[#CCC] hover:text-[#888] opacity-0 group-hover:opacity-100 transition-all">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <button className="flex items-center gap-2 border-2 border-dashed border-[#E0E0E0] rounded-lg px-4 py-2.5 hover:border-[#1D428A] hover:text-[#1D428A] text-[#CCC] transition-all">
                    <Plus size={14} />
                    <span className="font-condensed font-bold text-[11px] uppercase tracking-[0.5px]">Add Player</span>
                  </button>
                </div>
              </section>

              {/* Notification note */}
              <div className="bg-[#F0F4FF] border border-[#1D428A]/20 rounded-lg p-3 flex items-start gap-2">
                <Bell size={13} className="text-[#1D428A] mt-0.5 flex-shrink-0" />
                <p className="font-sans text-[12px] text-[#444] leading-relaxed">
                  You'll receive notifications when any of your favourite teams or players have a game starting, active markets, or breaking news.
                </p>
              </div>
            </div>

            {/* Right: profile details */}
            <div className="space-y-4">
              <div className="bg-white border border-[#E0E0E0] rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-[#E0E0E0] bg-[#F5F5F5]">
                  <span className="font-condensed font-bold text-[14px] uppercase text-[#111] tracking-[2px]">Profile Details</span>
                </div>
                <div className="p-4 space-y-3">
                  {[
                    { label: "Name", value: USER.name },
                    { label: "Username", value: `@${USER.username}` },
                    { label: "Email", value: USER.email },
                    { label: "Twitter", value: USER.twitter },
                    { label: "Instagram", value: USER.instagram },
                  ].map((f) => (
                    <div key={f.label}>
                      <div className="font-condensed font-bold text-[9px] uppercase text-[#AAA] tracking-[0.5px] mb-0.5">{f.label}</div>
                      {editing ? (
                        <input defaultValue={f.value}
                          className="w-full font-sans text-[12px] text-[#111] border border-[#E0E0E0] rounded-sm px-2 py-1.5 outline-none focus:border-[#1D428A] transition-colors" />
                      ) : (
                        <div className="font-sans text-[12px] text-[#333]">{f.value}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Rank context */}
              <div className="bg-white border border-[#E0E0E0] rounded-lg p-4">
                <div className="font-condensed font-bold text-[11px] uppercase text-[#888] tracking-[0.5px] mb-2">Your Standing</div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-sans text-[12px] text-[#444]">Rank #{USER.rank} of {LEADERBOARD.length}+</span>
                  <span className="font-mono font-semibold text-[12px] text-[#F5A623]">{USER.points} pts</span>
                </div>
                <div className="h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                  <div className="h-full bg-[#F5A623] rounded-full" style={{ width: `${Math.round((1 - USER.rank / LEADERBOARD.length) * 100)}%` }} />
                </div>
                <p className="font-sans text-[11px] text-[#888] mt-2">
                  {LEADERBOARD.length - USER.rank} players behind you · {USER.rank - 1} ahead
                </p>
              </div>
            </div>

          </div>
        )}

        {activeTab === "live" && (
          <div>
            <p className="font-sans text-[12px] text-[#888] mb-4">Your active calls tonight.</p>
            {ACTIVE_MARKETS.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ACTIVE_MARKETS.slice(0, 2).map(poll => <PollCard key={poll.id} poll={poll} />)}
              </div>
            ) : (
              <div className="text-center py-12 bg-[#F5F5F5] rounded-lg">
                <p className="font-sans text-[13px] text-[#888]">No live calls yet — head to Markets to vote.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "resolved" && (
          <div>
            <p className="font-sans text-[12px] text-[#888] mb-4">Your resolved call history.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MY_CALLS.map(poll => <PollCard key={poll.id} poll={poll as any} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
