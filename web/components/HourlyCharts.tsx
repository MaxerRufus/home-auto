'use client';

import React, { useState } from 'react';
import { BarChart3, TrendingUp, Calendar, Clock, Database, Info } from 'lucide-react';
import { SensorBlob } from '@/lib/types';
import { decodeHourlyBlob, computeHourlyAverages, SensorFrame } from '@/lib/bitpack';

interface HourlyChartsProps {
  blobs: SensorBlob[];
}

export default function HourlyCharts({ blobs }: HourlyChartsProps) {
  const [selectedBlobIndex, setSelectedBlobIndex] = useState(0);
  const [selectedMetric, setSelectedMetric] = useState<'temp' | 'hum' | 'ldr' | 'occ'>('temp');

  // Decode selected blob
  const activeBlob = blobs[selectedBlobIndex];

  let frames: SensorFrame[] = [];
  if (activeBlob && activeBlob.data) {
    try {
      let rawBytes: Uint8Array;
      if (typeof activeBlob.data === 'string' && activeBlob.data.startsWith('\\x')) {
        // Hex bytea string from Postgres
        const hex = activeBlob.data.slice(2);
        rawBytes = new Uint8Array(hex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []);
      } else if (typeof activeBlob.data === 'string') {
        // Base64 string
        const binStr = atob(activeBlob.data);
        rawBytes = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) {
          rawBytes[i] = binStr.charCodeAt(i);
        }
      } else {
        rawBytes = new Uint8Array(activeBlob.data);
      }
      frames = decodeHourlyBlob(rawBytes);
    } catch {
      frames = [];
    }
  }

  const averages = frames.length > 0 ? computeHourlyAverages(frames) : null;

  const getMetricData = () => {
    switch (selectedMetric) {
      case 'temp':
        return {
          title: 'Room Temperature',
          unit: '°C',
          values: frames.map((f) => f.temperature),
          avg: averages ? `${averages.avgTemperature} °C` : '—',
          color: 'var(--accent-rose)',
          min: 15,
          max: 35,
        };
      case 'hum':
        return {
          title: 'Relative Humidity',
          unit: '%',
          values: frames.map((f) => f.humidity),
          avg: averages ? `${averages.avgHumidity} %` : '—',
          color: 'var(--accent-cyan)',
          min: 0,
          max: 100,
        };
      case 'ldr':
        return {
          title: 'Ambient Light (10-bit ADC)',
          unit: 'Raw',
          values: frames.map((f) => f.ldr),
          avg: averages ? `${averages.avgLdr}` : '—',
          color: 'var(--accent-amber)',
          min: 0,
          max: 1023,
        };
      case 'occ':
        return {
          title: 'Room Occupancy Count',
          unit: 'People',
          values: frames.map((f) => f.occupancy),
          avg: averages ? `${averages.avgOccupancy}` : '—',
          color: 'var(--accent-green)',
          min: 0,
          max: 5,
        };
    }
  };

  const metric = getMetricData();

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div className="tile-icon" style={{ color: 'var(--accent-blue)', background: 'rgba(59, 130, 246, 0.1)' }}>
            <BarChart3 size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Hourly Bitpacked Telemetry (360 Bytes)</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Compressed 48-bit minute frames from Supabase bytea
            </p>
          </div>
        </div>

        {/* Metric Selector Tabs */}
        {frames.length > 0 && (
          <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '3px', borderRadius: 'var(--radius-sm)' }}>
            <button
              onClick={() => setSelectedMetric('temp')}
              className={`btn ${selectedMetric === 'temp' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
            >
              Temp
            </button>
            <button
              onClick={() => setSelectedMetric('hum')}
              className={`btn ${selectedMetric === 'hum' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
            >
              Humidity
            </button>
            <button
              onClick={() => setSelectedMetric('ldr')}
              className={`btn ${selectedMetric === 'ldr' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
            >
              Light
            </button>
            <button
              onClick={() => setSelectedMetric('occ')}
              className={`btn ${selectedMetric === 'occ' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
            >
              Occupancy
            </button>
          </div>
        )}
      </div>

      {frames.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '2.5rem 1.5rem',
            background: 'var(--bg-secondary)',
            border: '1px dashed var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-secondary)',
          }}
        >
          <div className="tile-icon" style={{ width: '40px', height: '40px', margin: '0 auto 0.75rem', color: 'var(--text-muted)' }}>
            <Database size={20} />
          </div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
            No Hourly Blobs Uploaded Yet
          </h3>
          <p style={{ fontSize: '0.825rem', maxWidth: '420px', margin: '0 auto', lineHeight: 1.5 }}>
            The ESP8266 samples all sensors every minute and packs each reading into 6 bytes. At the top of every hour, it POSTs the 360-byte payload to <code>/api/device/telemetry/blob</code>.
          </p>
        </div>
      ) : (
        <>
          {/* Metric Summary Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {metric.title} ({frames.length} Minutes)
            </span>
            <span style={{ fontSize: '1.15rem', fontWeight: 700, color: metric.color }}>
              Hourly Average: {metric.avg}
            </span>
          </div>

          {/* SVG Sparkline / Bar Chart */}
          <div className="chart-bars" style={{ height: '120px' }}>
            {metric.values.map((v, i) => {
              const range = metric.max - metric.min || 1;
              const heightPct = Math.max(8, Math.min(100, Math.round(((v - metric.min) / range) * 100)));

              return (
                <div
                  key={i}
                  className="chart-bar-col"
                  style={{
                    height: `${heightPct}%`,
                    backgroundColor: metric.color,
                    opacity: 0.75,
                  }}
                  title={`Minute ${i}: ${typeof v === 'number' ? v.toFixed(1) : v} ${metric.unit}`}
                />
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>Min 0</span>
            <span>Min 15</span>
            <span>Min 30</span>
            <span>Min 45</span>
            <span>Min 59</span>
          </div>
        </>
      )}
    </div>
  );
}
