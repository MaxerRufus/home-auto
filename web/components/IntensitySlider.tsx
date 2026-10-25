'use client';

import React from 'react';
import { SunMedium, Sparkles, Sliders, Flame } from 'lucide-react';

interface IntensitySliderProps {
  intensity: number;
  onChangeIntensity: (level: number) => void;
}

export default function IntensitySlider({ intensity, onChangeIntensity }: IntensitySliderProps) {
  // Determine active level band
  const getActiveBand = (val: number) => {
    if (val === 0) return { id: 0, label: 'Both Lights Off', details: 'Relay 0: OFF, Relay 1: OFF' };
    if (val <= 40) return { id: 1, label: 'Light A Soft (1–40%)', details: 'Relay 0: ON, Relay 1: OFF' };
    if (val <= 70) return { id: 2, label: 'Light B Ambient (41–70%)', details: 'Relay 0: OFF, Relay 1: ON' };
    return { id: 3, label: 'Full Brilliance (71–100%)', details: 'Relay 0: ON, Relay 1: ON' };
  };

  const activeBand = getActiveBand(intensity);

  return (
    <div
      className="glass-panel"
      style={{
        padding: '1.75rem',
        borderRadius: '24px',
        marginBottom: '2rem',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            className="hume-icon-box"
            style={{
              width: '44px',
              height: '44px',
              background: intensity > 0 ? 'rgba(255, 107, 53, 0.16)' : 'rgba(255, 255, 255, 0.05)',
              color: intensity > 0 ? 'var(--accent-orange)' : 'var(--text-muted)',
              border: intensity > 0 ? '1px solid rgba(255, 107, 53, 0.35)' : '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <SunMedium size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Dual-Light Intensity
            </h2>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
              Sinric Pro Dimmable Light mapping with discrete Relay 0 & 1 stages
            </p>
          </div>
        </div>

        {/* Big Live Value Counter */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: intensity > 0 ? '#ff8843' : '#94a3b8', letterSpacing: '-0.02em' }}>
            {intensity}
          </span>
          <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>%</span>
        </div>
      </div>

      {/* Hume Tactile Filled Slider Track */}
      <div style={{ margin: '1.5rem 0 1.25rem 0', position: 'relative' }}>
        <input
          type="range"
          min="0"
          max="100"
          value={intensity}
          onChange={(e) => onChangeIntensity(Number(e.target.value))}
          style={{
            WebkitAppearance: 'none',
            appearance: 'none',
            width: '100%',
            height: '14px',
            borderRadius: '9999px',
            background: `linear-gradient(90deg, #ff8843 0%, #ff6b35 ${intensity}%, rgba(148, 163, 184, 0.25) ${intensity}%, rgba(148, 163, 184, 0.25) 100%)`,
            outline: 'none',
            cursor: 'pointer',
            transition: 'background 0.1s ease',
          }}
          aria-label="Light intensity level"
        />
      </div>

      {/* Active Band Badge & Explanation */}
      <div
        style={{
          padding: '1rem 1.25rem',
          borderRadius: '16px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
        }}
      >
        <div>
          <span style={{ fontWeight: 700, fontSize: '0.925rem', color: 'var(--text-primary)' }}>
            Stage: {activeBand.label}
          </span>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {activeBand.details}
          </p>
        </div>

        <span
          style={{
            padding: '0.35rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: intensity > 0 ? 'rgba(255, 107, 53, 0.15)' : 'rgba(255, 255, 255, 0.06)',
            color: intensity > 0 ? '#ff8843' : '#94a3b8',
            border: intensity > 0 ? '1px solid rgba(255, 107, 53, 0.35)' : '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Sparkles size={12} />
          <span>{intensity > 0 ? 'Active Stage' : 'All Off'}</span>
        </span>
      </div>

      {/* Tactile Quick Stage Preset Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.65rem' }}>
        <button
          onClick={() => onChangeIntensity(0)}
          className={`btn ${intensity === 0 ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.6rem 0.5rem', fontSize: '0.8rem', borderRadius: '14px' }}
        >
          Off (0%)
        </button>
        <button
          onClick={() => onChangeIntensity(25)}
          className={`btn ${intensity > 0 && intensity <= 40 ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.6rem 0.5rem', fontSize: '0.8rem', borderRadius: '14px' }}
        >
          Soft (25%)
        </button>
        <button
          onClick={() => onChangeIntensity(55)}
          className={`btn ${intensity > 40 && intensity <= 70 ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.6rem 0.5rem', fontSize: '0.8rem', borderRadius: '14px' }}
        >
          Medium (55%)
        </button>
        <button
          onClick={() => onChangeIntensity(85)}
          className={`btn ${intensity > 70 ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.6rem 0.5rem', fontSize: '0.8rem', borderRadius: '14px' }}
        >
          Full (85%)
        </button>
      </div>
    </div>
  );
}
