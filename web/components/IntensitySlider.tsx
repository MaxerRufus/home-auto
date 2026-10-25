'use client';

import React from 'react';
import { SunMedium, Sparkles } from 'lucide-react';

interface IntensitySliderProps {
  intensity: number;
  onChangeIntensity: (level: number) => void;
}

export default function IntensitySlider({ intensity, onChangeIntensity }: IntensitySliderProps) {
  // Determine active level band
  const getActiveBand = (val: number) => {
    if (val === 0) return { id: 0, label: 'Both Lights Off', details: 'Relay 1: OFF, Relay 2: OFF' };
    if (val <= 40) return { id: 1, label: 'Light A Only (1–40%)', details: 'Relay 1: ON, Relay 2: OFF' };
    if (val <= 70) return { id: 2, label: 'Light B Only (41–70%)', details: 'Relay 1: OFF, Relay 2: ON' };
    return { id: 3, label: 'Both Lights On (71–100%)', details: 'Relay 1: ON, Relay 2: ON' };
  };

  const activeBand = getActiveBand(intensity);

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div className="tile-icon" style={{ color: 'var(--accent-amber)' }}>
            <SunMedium size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Dual-Light Intensity Group</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Sinric Pro Dimmable Light mapping (0–100%)
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
          <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent-amber)' }}>
            {intensity}
          </span>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>%</span>
        </div>
      </div>

      {/* Range Slider */}
      <div style={{ margin: '1.25rem 0 1rem 0' }}>
        <input
          type="range"
          min="0"
          max="100"
          value={intensity}
          onChange={(e) => onChangeIntensity(Number(e.target.value))}
          className="custom-slider"
          aria-label="Light intensity level"
        />
      </div>

      {/* Active Band Badge & Explanations */}
      <div
        style={{
          padding: '0.85rem 1rem',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <div>
          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
            Active Stage: {activeBand.label}
          </span>
          <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
            {activeBand.details}
          </p>
        </div>

        <span className="badge badge-active">
          <Sparkles size={11} />
          Discrete Step
        </span>
      </div>

      {/* Quick Stage Preset Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => onChangeIntensity(0)}
          className={`btn ${intensity === 0 ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, padding: '0.4rem 0.5rem', fontSize: '0.775rem' }}
        >
          0% (Off)
        </button>
        <button
          onClick={() => onChangeIntensity(25)}
          className={`btn ${intensity > 0 && intensity <= 40 ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, padding: '0.4rem 0.5rem', fontSize: '0.775rem' }}
        >
          25% (Light A)
        </button>
        <button
          onClick={() => onChangeIntensity(55)}
          className={`btn ${intensity > 40 && intensity <= 70 ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, padding: '0.4rem 0.5rem', fontSize: '0.775rem' }}
        >
          55% (Light B)
        </button>
        <button
          onClick={() => onChangeIntensity(85)}
          className={`btn ${intensity > 70 ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, padding: '0.4rem 0.5rem', fontSize: '0.775rem' }}
        >
          85% (Both)
        </button>
      </div>
    </div>
  );
}
