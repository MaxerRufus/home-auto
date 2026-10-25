'use client';

import React from 'react';
import { Users, Thermometer, Droplets, Sun, Activity, Wifi, Clock } from 'lucide-react';
import { DeviceState } from '@/lib/types';

interface DeviceLiveTilesProps {
  state: DeviceState;
  isOnline: boolean;
  lastSeenTime: string;
}

export default function DeviceLiveTiles({ state, isOnline, lastSeenTime }: DeviceLiveTilesProps) {
  // Humidity comfort assessment
  const getHumidityStatus = (hum: number) => {
    if (hum < 30) return { label: 'Dry', color: 'var(--accent-amber)' };
    if (hum <= 60) return { label: 'Optimal', color: 'var(--accent-green)' };
    return { label: 'Humid', color: 'var(--accent-cyan)' };
  };

  // Ambient light status
  const getLightStatus = (pct: number) => {
    if (pct < 25) return { label: 'Dark Room', color: 'var(--accent-purple)' };
    if (pct < 70) return { label: 'Dim / Ambient', color: 'var(--accent-blue)' };
    return { label: 'Bright Daylight', color: 'var(--accent-amber)' };
  };

  const humStatus = getHumidityStatus(state.humidity || 50);
  const lightStatus = getLightStatus(state.ambient_light || 45);

  return (
    <div className="tiles-grid">
      {/* 1. Occupancy Tile */}
      <div className="glass-panel sensor-tile">
        <div className="tile-header">
          <span>Occupancy</span>
          <div className="tile-icon" style={{ color: 'var(--accent-cyan)' }}>
            <Users size={18} />
          </div>
        </div>
        <div className="tile-value">
          {state.occupancy ?? 0}
          <span className="tile-unit">people</span>
        </div>
        <div className="tile-subtext">
          Doorway ultrasonic estimate (clamped ≥ 0)
        </div>
      </div>

      {/* 2. Temperature Tile */}
      <div className="glass-panel sensor-tile">
        <div className="tile-header">
          <span>Room Temperature</span>
          <div className="tile-icon" style={{ color: 'var(--accent-rose)' }}>
            <Thermometer size={18} />
          </div>
        </div>
        <div className="tile-value">
          {typeof state.temperature === 'number' ? state.temperature.toFixed(1) : '24.5'}
          <span className="tile-unit">°C</span>
        </div>
        <div className="tile-subtext">
          DHT11 5-min rolling average (stable)
        </div>
      </div>

      {/* 3. Humidity Tile */}
      <div className="glass-panel sensor-tile">
        <div className="tile-header">
          <span>Relative Humidity</span>
          <div className="tile-icon" style={{ color: 'var(--accent-cyan)' }}>
            <Droplets size={18} />
          </div>
        </div>
        <div className="tile-value">
          {typeof state.humidity === 'number' ? Math.round(state.humidity) : 48}
          <span className="tile-unit">%</span>
        </div>
        <div className="tile-subtext" style={{ color: humStatus.color }}>
          Status: {humStatus.label}
        </div>
      </div>

      {/* 4. Ambient Light Tile */}
      <div className="glass-panel sensor-tile">
        <div className="tile-header">
          <span>Ambient Light</span>
          <div className="tile-icon" style={{ color: 'var(--accent-amber)' }}>
            <Sun size={18} />
          </div>
        </div>
        <div className="tile-value">
          {typeof state.ambient_light === 'number' ? state.ambient_light : 60}
          <span className="tile-unit">%</span>
        </div>
        <div className="tile-subtext" style={{ color: lightStatus.color }}>
          {lightStatus.label} (calibrated)
        </div>
      </div>

      {/* 5. Vibration / Knock Tile */}
      <div className="glass-panel sensor-tile">
        <div className="tile-header">
          <span>Vibration & Knock</span>
          <div className="tile-icon" style={{ color: 'var(--accent-purple)' }}>
            <Activity size={18} />
          </div>
        </div>
        <div className="tile-value" style={{ fontSize: '1.4rem' }}>
          {isOnline ? 'Monitoring' : 'Standby'}
        </div>
        <div className="tile-subtext">
          MPU6050 IMU rest & spike baseline
        </div>
      </div>

      {/* 6. Connection Status Tile */}
      <div className="glass-panel sensor-tile">
        <div className="tile-header">
          <span>Connection</span>
          <div className="tile-icon" style={{ color: isOnline ? 'var(--accent-green)' : 'var(--text-muted)' }}>
            <Wifi size={18} />
          </div>
        </div>
        <div className="tile-value" style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span className={`status-dot ${isOnline ? 'online' : 'offline'}`} />
          <span>{isOnline ? 'Live WebSocket' : 'Offline'}</span>
        </div>
        <div className="tile-subtext">
          Target latency ~100-200ms
        </div>
      </div>
    </div>
  );
}
