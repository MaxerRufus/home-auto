'use client';

import React from 'react';
import { LogIn, LogOut, Bell, ToggleLeft, Activity, Radio } from 'lucide-react';
import { DeviceEvent } from '@/lib/types';

interface EventsFeedProps {
  events: DeviceEvent[];
}

export default function EventsFeed({ events }: EventsFeedProps) {
  const getEventMeta = (ev: DeviceEvent) => {
    switch (ev.type_code) {
      case 1:
        return {
          label: 'Doorway Entry',
          icon: <LogIn size={15} style={{ color: 'var(--accent-green)' }} />,
          class: 'entry',
          desc: ev.value
            ? `Estimated height: ${ev.value} cm (${ev.metadata?.band || 'Estimated'})`
            : 'Person entered room',
        };
      case 2:
        return {
          label: 'Doorway Exit',
          icon: <LogOut size={15} style={{ color: 'var(--accent-amber)' }} />,
          class: 'exit',
          desc: ev.value
            ? `Estimated height: ${ev.value} cm (${ev.metadata?.band || 'Estimated'})`
            : 'Person exited room',
        };
      case 3:
        return {
          label: 'Knock Detected',
          icon: <Bell size={15} style={{ color: 'var(--accent-rose)' }} />,
          class: 'knock',
          desc: `Acceleration spike: ${ev.value ? ev.value.toFixed(1) : 'Spike'} m/s² above baseline`,
        };
      case 4:
        return {
          label: 'Wall Switch Press',
          icon: <ToggleLeft size={15} style={{ color: 'var(--accent-purple)' }} />,
          class: 'switch',
          desc: `Physical switch ${Number(ev.value) + 1} pressed (falling edge toggled)`,
        };
      case 5:
        return {
          label: 'Relay State Toggled',
          icon: <Activity size={15} style={{ color: 'var(--accent-cyan)' }} />,
          class: 'relay',
          desc: `Relay ${ev.value !== null ? Number(ev.value) + 1 : ''} ${
            ev.metadata?.state ? 'turned ON' : 'turned OFF'
          } (${ev.metadata?.source || 'system'})`,
        };
      default:
        return {
          label: 'System Event',
          icon: <Radio size={15} />,
          class: '',
          desc: 'Event recorded',
        };
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div className="tile-icon" style={{ color: 'var(--accent-green)' }}>
            <Radio size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Live Telemetry & Events Feed</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Realtime stream of discrete door crossings, knocks, and physical wall switches
            </p>
          </div>
        </div>

        <span className="badge badge-online">
          <span className="status-dot online" />
          Live Log
        </span>
      </div>

      <div className="event-list">
        {events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
            No recent events recorded. Walk past the doorway or press a switch to test.
          </div>
        ) : (
          events.map((ev, idx) => {
            const meta = getEventMeta(ev);
            return (
              <div key={ev.id || idx} className={`event-item ${meta.class}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  {meta.icon}
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{meta.label}</span>
                </div>

                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                  {meta.desc}
                </span>

                <span className="event-time">
                  {formatTimestamp(ev.created_at)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
