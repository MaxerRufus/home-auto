'use client';

import React, { useState } from 'react';
import { Lightbulb, Fan, Zap, Wind, Power, Edit2, Check, Clock } from 'lucide-react';
import { Relay, RelayCategory } from '@/lib/types';

interface RelayControlListProps {
  relays: Relay[];
  overrideActive: boolean;
  overrideRemainingSec: number;
  onToggleRelay: (index: number, newState: boolean) => void;
  onUpdateRelayMeta: (index: number, newLabel: string, newCategory: RelayCategory) => void;
  onStopOverride: () => void;
}

export default function RelayControlList({
  relays,
  overrideActive,
  overrideRemainingSec,
  onToggleRelay,
  onUpdateRelayMeta,
  onStopOverride,
}: RelayControlListProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editCategory, setEditCategory] = useState<RelayCategory>('light');

  const startEditing = (relay: Relay) => {
    setEditingIndex(relay.relay_index);
    setEditLabel(relay.label);
    setEditCategory(relay.category);
  };

  const saveEditing = (index: number) => {
    onUpdateRelayMeta(index, editLabel, editCategory);
    setEditingIndex(null);
  };

  const getCategoryIcon = (category: RelayCategory) => {
    switch (category) {
      case 'light': return <Lightbulb size={22} />;
      case 'fan': return <Fan size={22} />;
      case 'plug': return <Zap size={22} />;
      case 'ac': return <Wind size={22} />;
      default: return <Power size={22} />;
    }
  };

  const formatOverrideTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Appliance & Relay Controls</h2>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            Direct control via Supabase Realtime channel (100–200ms latency)
          </p>
        </div>

        {overrideActive && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="badge badge-override" title="Automation paused after manual switch or command">
              <Clock size={12} />
              Manual Override: {formatOverrideTime(overrideRemainingSec)}
            </span>
            <button
              onClick={onStopOverride}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
            >
              Resume Auto
            </button>
          </div>
        )}
      </div>

      <div className="relays-container">
        {relays.map((relay) => {
          const isEditing = editingIndex === relay.relay_index;

          return (
            <div
              key={relay.relay_index}
              className={`relay-item ${relay.state ? 'is-on' : ''}`}
            >
              <div className="relay-info">
                <div className="relay-icon-box">
                  {getCategoryIcon(relay.category)}
                </div>

                <div>
                  {isEditing ? (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.9rem', width: '150px' }}
                      />
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value as RelayCategory)}
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                      >
                        <option value="light">Light</option>
                        <option value="fan">Fan</option>
                        <option value="plug">Plug</option>
                        <option value="ac">AC</option>
                        <option value="other">Other</option>
                      </select>
                      <button
                        onClick={() => saveEditing(relay.relay_index)}
                        className="btn btn-primary"
                        style={{ padding: '0.4rem 0.75rem' }}
                      >
                        <Check size={15} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="relay-title" style={{ color: 'var(--text-primary)' }}>{relay.label}</span>
                        <button
                          onClick={() => startEditing(relay)}
                          style={{ color: 'var(--text-muted)', display: 'inline-flex', padding: '2px' }}
                          title="Rename relay or change category"
                        >
                          <Edit2 size={13} />
                        </button>
                      </div>
                      <span className="relay-category" style={{ color: 'var(--text-secondary)' }}>
                        Category: {relay.category.toUpperCase()} • Channel P{relay.relay_index}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: relay.state ? 'var(--accent-orange)' : 'var(--text-muted)',
                    letterSpacing: '0.04em',
                  }}
                >
                  {relay.state ? 'ON' : 'OFF'}
                </span>

                <label className="toggle-switch" aria-label={`Toggle ${relay.label}`}>
                  <input
                    type="checkbox"
                    checked={relay.state}
                    onChange={(e) => onToggleRelay(relay.relay_index, e.target.checked)}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
