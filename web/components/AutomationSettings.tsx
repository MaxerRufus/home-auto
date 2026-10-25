'use client';

import React, { useState } from 'react';
import { Sliders, Sun, Thermometer, ShieldCheck, Save, Info } from 'lucide-react';
import { DeviceConfig } from '@/lib/types';

interface AutomationSettingsProps {
  config: DeviceConfig;
  onSaveConfig: (newConfig: DeviceConfig) => void;
}

export default function AutomationSettings({ config, onSaveConfig }: AutomationSettingsProps) {
  const [localConfig, setLocalConfig] = useState<DeviceConfig>(config);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    onSaveConfig(localConfig);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div className="tile-icon" style={{ color: 'var(--accent-purple)' }}>
            <Sliders size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Local Automation Rules</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Evaluated directly on the ESP8266 (operates without internet)
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="btn btn-primary"
          style={{ fontSize: '0.85rem' }}
        >
          <Save size={15} />
          {savedSuccess ? 'Synced to ESP!' : 'Save & Sync'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Rule 1: Auto Lights */}
        <div
          style={{
            padding: '1.25rem',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sun size={18} style={{ color: 'var(--accent-amber)' }} />
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Auto Lights Rule</span>
            </div>

            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={localConfig.auto_lights}
                onChange={(e) => setLocalConfig({ ...localConfig, auto_lights: e.target.checked })}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Turns on lights when room is occupied and ambient light drops below threshold. Automatically turns off after 3 minutes with zero occupancy or when daylight rises well above threshold.
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Light Turn-On Threshold:</span>
            <span style={{ fontWeight: 600, color: 'var(--accent-amber)' }}>{localConfig.light_threshold}% Ambient</span>
          </div>
          <input
            type="range"
            min="10"
            max="80"
            value={localConfig.light_threshold}
            onChange={(e) => setLocalConfig({ ...localConfig, light_threshold: Number(e.target.value) })}
            className="custom-slider"
          />
        </div>

        {/* Rule 2: Auto Plug / Fan */}
        <div
          style={{
            padding: '1.25rem',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Thermometer size={18} style={{ color: 'var(--accent-rose)' }} />
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Auto Plug (Fan / Cooling) Rule</span>
            </div>

            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={localConfig.auto_plug}
                onChange={(e) => setLocalConfig({ ...localConfig, auto_plug: e.target.checked })}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Turns on Relay 3 (Plug/Fan) when occupied and temperature meets or exceeds threshold. Automatically turns off when room is empty or temperature drops 2.0 °C below threshold (hysteresis).
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Temperature Activation Threshold:</span>
            <span style={{ fontWeight: 600, color: 'var(--accent-rose)' }}>{localConfig.temp_threshold} °C</span>
          </div>
          <input
            type="range"
            min="18"
            max="35"
            step="0.5"
            value={localConfig.temp_threshold}
            onChange={(e) => setLocalConfig({ ...localConfig, temp_threshold: Number(e.target.value) })}
            className="custom-slider"
          />
        </div>

        {/* Informational Callout */}
        <div
          style={{
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(59, 130, 246, 0.06)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.65rem',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
          }}
        >
          <Info size={16} style={{ color: 'var(--accent-blue)', flexShrink: 0, marginTop: '2px' }} />
          <span>
            <strong>Manual Override Principle:</strong> Any manual wall switch toggle or user command automatically pauses local automations for 30 minutes, preventing conflicting automation jitter.
          </span>
        </div>
      </div>
    </div>
  );
}
