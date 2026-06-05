import React from 'react';

// Renders the special cosmic_card post (or a live preview of /api/cosmic/me)
export default function CosmicCard({ data, compact = false }) {
  if (!data) return null;
  const n = data.now || {};
  const natal = data.natal;

  const nextFull = n.next_full_iso ? new Date(n.next_full_iso) : null;
  let countdown = null;
  if (nextFull) {
    const delta = Math.max(0, nextFull.getTime() - Date.now());
    const d = Math.floor(delta / 86400000);
    const h = Math.floor((delta % 86400000) / 3600000);
    const m = Math.floor((delta % 3600000) / 60000);
    countdown = { d, h, m };
  }

  return (
    <div
      className="rounded-2xl border border-cosmos-purple/40 overflow-hidden relative"
      style={{
        backgroundImage:
          'radial-gradient(800px 400px at 90% -10%, rgba(110,64,201,0.35), transparent 60%),' +
          'radial-gradient(600px 400px at -10% 110%, rgba(31,111,235,0.25), transparent 60%),' +
          'linear-gradient(135deg, #1a1f36 0%, #0a0d1a 100%)',
      }}
      data-testid="cosmic-card"
    >
      <div className="px-5 pt-5">
        <div className="flex items-center gap-2">
          <span className="label-mono text-cosmos-purple">Cosmic Card</span>
          {natal && (
            <span className="text-xs text-cosmos-mist">· born {natal.birth_date}</span>
          )}
        </div>

        {natal ? (
          <div className="mt-3 grid grid-cols-4 gap-3">
            <div className="text-center">
              <div className="label-mono text-cosmos-mist mb-1">Sun</div>
              <div className="display text-cosmos-glow font-bold leading-tight">
                <span className="text-xl mr-1">{natal.sun_symbol}</span>{natal.sun_sign}
              </div>
            </div>
            <div className="text-center">
              <div className="label-mono text-cosmos-mist mb-1">Moon</div>
              <div className="display text-cosmos-glow font-bold leading-tight">
                <span className="text-xl mr-1">{natal.moon_symbol}</span>{natal.moon_sign}
              </div>
            </div>
            <div className="text-center">
              <div className="label-mono text-cosmos-mist mb-1">Birth Phase</div>
              <div className="display text-cosmos-glow font-bold leading-tight">
                <span className="text-xl">{natal.birth_phase_emoji}</span>
              </div>
            </div>
            <div className="text-center">
              <div className="label-mono text-cosmos-mist mb-1">Full Moons</div>
              <div className="display text-cosmos-glow font-bold leading-tight">
                {natal.total_full_moons_lived}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-3 text-sm text-cosmos-mist">
            Set your birth date in profile settings to unlock your full natal chart on this card.
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-black/30 border border-white/5 p-2 text-center">
            <div className="text-2xl">{n.phase_emoji}</div>
            <div className="text-[0.7rem] text-cosmos-glow font-semibold mt-0.5">{n.phase_name}</div>
            <div className="label-mono text-cosmos-mist">Now</div>
          </div>
          <div className="rounded-xl bg-black/30 border border-white/5 p-2 text-center">
            <div className="display text-xl text-cosmos-glow font-bold">{n.illum_pct}%</div>
            <div className="label-mono text-cosmos-mist">Glow</div>
          </div>
          <div className="rounded-xl bg-black/30 border border-white/5 p-2 text-center">
            <div className="display text-xl text-cosmos-glow font-bold">{n.age_days}d</div>
            <div className="label-mono text-cosmos-mist">Age</div>
          </div>
        </div>

        {!compact && (
          <div className="mt-3 rounded-xl bg-cosmos-violet/15 border border-cosmos-purple/30 p-3">
            <div className="text-sm text-cosmos-glow">
              <span className="font-semibold mr-1">{n.moon_symbol} Moon in {n.moon_sign}:</span>
              <span className="text-cosmos-glow/85">{n.moon_vibe}</span>
            </div>
            {natal && (
              <div className="text-sm text-cosmos-blue mt-2">
                <span className="font-semibold mr-1">✨ {natal.aspect}:</span>
                <span className="text-cosmos-glow/85">{natal.guidance}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {countdown && (
        <div className="px-5 pb-5 pt-3">
          <div className="label-mono text-cosmos-mist mb-1">Next full moon in</div>
          <div className="flex gap-2">
            {[
              ['Days', countdown.d],
              ['Hours', countdown.h],
              ['Mins', countdown.m],
            ].map(([lbl, val]) => (
              <div key={lbl} className="flex-1 rounded-lg bg-black/40 border border-white/5 px-2 py-1 text-center">
                <div className="display text-cosmos-glow font-bold text-lg leading-tight">{val}</div>
                <div className="label-mono text-cosmos-mist text-[0.55rem]">{lbl}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
