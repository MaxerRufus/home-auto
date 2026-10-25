'use client';

import React from 'react';
import { Users, Thermometer, Droplets, Sun, Activity, Wifi, WifiOff, Flame, Wind, Sparkles } from 'lucide-react';
import { DeviceState } from '@/lib/types';

interface DeviceLiveTilesProps {
  state?: DeviceState | null;
  isOnline: boolean;
  lastSeenTime?: string | null;
}

export default function DeviceLiveTiles({ state, isOnline, lastSeenTime }: DeviceLiveTilesProps) {
  // Humidity comfort assessment
  const getHumidityStatus = (hum?: number | null) => {
    if (hum == null) return { label: 'Awaiting data', color: 'var(--text-muted)' };
    if (hum < 30) return { label: 'Dry air', color: 'var(--accent-amber)' };
    if (hum <= 60) return { label: 'Optimal comfort', color: 'var(--accent-green)' };
    return { label: 'High humidity', color: 'var(--accent-cyan)' };
  };

  // Ambient light status
  const getLightStatus = (pct?: number | null) => {
    if (pct == null) return { label: 'Awaiting data', color: 'var(--text-muted)' };
    if (pct < 25) return { label: 'Dark Room', color: 'var(--accent-purple)' };
    if (pct < 70) return { label: 'Ambient / Soft', color: 'var(--accent-blue)' };
    return { label: 'Bright Daylight', color: 'var(--accent-orange)' };
  };

  const formatLastSeen = (iso?: string | null) => {
    if (!iso) return 'Never connected';
    try {
      const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
      if (diffSec < 60) return `Active ${diffSec}s ago`;
      if (diffSec < 3600) return `Last seen ${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `Last seen ${Math.floor(diffSec / 3600)}h ago`;
      return `Last seen on ${new Date(iso).toLocaleDateString()}`;
    } catch {
      return 'Unknown';
    }
  };

  const hasTemp = isOnline && typeof state?.temperature === 'number';
  const hasHum = isOnline && typeof state?.humidity === 'number';
  const hasLight = isOnline && typeof state?.ambient_light === 'number';
  const hasOcc = isOnline && state?.occupancy != null;

  const humStatus = getHumidityStatus(hasHum ? state?.humidity : null);
  const lightStatus = getLightStatus(hasLight ? state?.ambient_light : null);

  // Compute radial arc stroke dashoffset for temperature (15°C - 35°C range)
  const tempVal = hasTemp ? state?.temperature! : 24;
  const tempPct = Math.max(0, Math.min(100, ((tempVal - 15) / 20) * 100));
  const radius = 48;
  const circumference = 2 * Math.PI * radius; // ~301.59
  const arcFraction = 0.75; // 270 degree arc
  const arcLength = circumference * arcFraction;
  const strokeDashoffset = arcLength - (arcLength * (tempPct / 100));

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      {/* Hume Hero Climate & Atmosphere Card */}
      <div
        className="glass-panel"
        style={{
          borderRadius: '28px',
          background: 'var(--bg-card)',
          border: isOnline ? '1px solid rgba(255, 107, 53, 0.35)' : '1px solid var(--border-color)',
          boxShadow: isOnline
            ? 'var(--shadow-lg), 0 0 35px rgba(255, 107, 53, 0.15)'
            : 'var(--shadow-lg)',
          padding: '2rem 2.25rem',
          marginBottom: '1.75rem',
          position: 'relative',
          overflow: 'hidden',
          transition: 'var(--transition)',
        }}
      >
        {/* Subtle warm glow background in online mode */}
        {isOnline && (
          <div
            style={{
              position: 'absolute',
              top: '-80px',
              left: '20%',
              width: '300px',
              height: '300px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255, 107, 53, 0.16) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '2rem',
            position: 'relative',
          }}
        >
          {/* Left: Climate Details */}
          <div style={{ maxWidth: '360px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '12px',
                  background: isOnline ? 'rgba(255, 107, 53, 0.16)' : 'rgba(255, 255, 255, 0.05)',
                  color: isOnline ? 'var(--accent-orange)' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: isOnline ? '1px solid rgba(255, 107, 53, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <Thermometer size={20} />
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Hume Indoor Climate
              </span>
            </div>

            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              {isOnline ? (hasTemp ? `${tempVal.toFixed(1)}°C` : 'Calibrating') : 'Hub Offline'}
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {isOnline
                ? `DHT11 sensor actively monitoring room temperature & comfort. Relative humidity is at ${hasHum ? Math.round(state?.humidity!) : '—'}%.`
                : 'Controller node is in standby. Waiting for telemetry packets over WebSocket.'}
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '9999px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  background: isOnline ? 'rgba(255, 107, 53, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                  color: isOnline ? '#ff8843' : 'var(--text-muted)',
                  border: isOnline ? '1px solid rgba(255, 107, 53, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <Flame size={13} />
                <span>{hasTemp ? (tempVal > 28 ? 'Warm' : tempVal < 20 ? 'Cool' : 'Optimal') : 'No Signal'}</span>
              </span>

              <span
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '9999px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  background: isOnline ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                  color: isOnline ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  border: isOnline ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <Droplets size={13} />
                <span>{humStatus.label}</span>
              </span>
            </div>
          </div>

          {/* Right: Signature Hume Circular Gauge Dial */}
          <div
            style={{
              position: 'relative',
              width: '180px',
              height: '180px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="180" height="180" viewBox="0 0 120 120" style={{ transform: 'rotate(135deg)', overflow: 'visible' }}>
              <defs>
                <linearGradient id="humeDialGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff8843" />
                  <stop offset="100%" stopColor="#ff6b35" />
                </linearGradient>
              </defs>
              {/* Background Track */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="var(--dial-track)"
                strokeWidth="8"
                strokeDasharray={`${arcLength} ${circumference}`}
                strokeLinecap="round"
              />
              {/* Progress Glow Arc */}
              {isOnline && hasTemp && (
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke="url(#humeDialGrad)"
                  strokeWidth="8"
                  strokeDasharray={`${arcLength} ${circumference}`}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{
                    filter: 'drop-shadow(0 0 8px rgba(255, 107, 53, 0.6))',
                    transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                />
              )}
            </svg>

            {/* Centered Dial Display */}
            <div
              style={{
                position: 'absolute',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                {hasTemp ? tempVal.toFixed(1) : '—'}
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-orange)', marginTop: '2px' }}>
                {hasTemp ? '°C' : 'OFFLINE'}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                TARGET 24°C
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Other Live Sensor Tiles */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {/* 1. Occupancy Tile */}
        <div
          className="glass-panel"
          style={{
            padding: '1.4rem',
            borderRadius: '22px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            transition: 'var(--transition-spring)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Room Occupancy</span>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: isOnline ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                color: isOnline ? 'var(--accent-cyan)' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: isOnline ? '1px solid rgba(56, 189, 248, 0.25)' : '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <Users size={18} />
            </div>
          </div>

          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
            {hasOcc ? state?.occupancy : '—'}
            {hasOcc && (
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                {state?.occupancy === 1 ? 'person' : 'people'}
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            {isOnline ? 'Dual HC-SR04 doorway tracking' : 'Offline • Awaiting signal'}
          </div>
        </div>

        {/* 2. Ambient Light Tile */}
        <div
          className="glass-panel"
          style={{
            padding: '1.4rem',
            borderRadius: '22px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            transition: 'var(--transition-spring)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Ambient Light</span>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: isOnline ? 'rgba(245, 158, 11, 0.14)' : 'rgba(255, 255, 255, 0.04)',
                color: isOnline ? 'var(--accent-amber)' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: isOnline ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <Sun size={18} />
            </div>
          </div>

          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
            {hasLight ? `${Math.round(state?.ambient_light!)}` : '—'}
            {hasLight && <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>%</span>}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            {isOnline ? lightStatus.label : 'Offline • LDR divider'}
          </div>
        </div>

        {/* 3. IMU Vibration / Knock */}
        <div
          className="glass-panel"
          style={{
            padding: '1.4rem',
            borderRadius: '22px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            transition: 'var(--transition-spring)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Knock / IMU</span>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: isOnline ? 'rgba(168, 85, 247, 0.14)' : 'rgba(255, 255, 255, 0.04)',
                color: isOnline ? 'var(--accent-purple)' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: isOnline ? '1px solid rgba(168, 85, 247, 0.25)' : '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <Activity size={18} />
            </div>
          </div>

          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: isOnline ? 'var(--accent-green)' : 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {isOnline ? 'Armed & Live' : 'Standby'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            {isOnline ? 'MPU6050 spike baseline' : 'Offline • No motion data'}
          </div>
        </div>

        {/* 4. WebSocket Status */}
        <div
          className="glass-panel"
          style={{
            padding: '1.4rem',
            borderRadius: '22px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            transition: 'var(--transition-spring)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Supabase Realtime</span>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: isOnline ? 'rgba(16, 185, 129, 0.14)' : 'rgba(255, 255, 255, 0.04)',
                color: isOnline ? 'var(--accent-green)' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: isOnline ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              {isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
            </div>
          </div>

          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className={`status-dot ${isOnline ? 'online' : 'offline'}`} />
            <span>{isOnline ? 'Connected' : 'Offline'}</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            {formatLastSeen(lastSeenTime)}
          </div>
        </div>
      </div>
    </div>
  );
}
