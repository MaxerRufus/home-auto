'use client';

import React, { useState } from 'react';
import { Trash2, AlertTriangle, X, Check, Loader2 } from 'lucide-react';

interface DeleteDeviceModalProps {
  isOpen: boolean;
  deviceId: string | null;
  deviceName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteDeviceModal({
  isOpen,
  deviceId,
  deviceName,
  onClose,
  onSuccess,
}: DeleteDeviceModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !deviceId) return null;

  const handleDelete = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/device/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to remove device');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error deleting device');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
        animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'linear-gradient(145deg, rgba(23, 27, 38, 0.98), rgba(15, 18, 27, 0.99))',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 35px rgba(244, 63, 94, 0.15)',
          borderRadius: '24px',
          padding: '2rem',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: 'rgba(244, 63, 94, 0.12)',
                border: '1px solid rgba(244, 63, 94, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-rose)',
              }}
            >
              <Trash2 size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                Remove Device
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Irreversible hardware unlinking
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-ghost btn-icon"
            style={{ borderRadius: '50%', width: '36px', height: '36px' }}
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: '12px',
              color: '#fda4af',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
            }}
          >
            {error}
          </div>
        )}

        {/* Warning Body */}
        <div style={{ marginBottom: '1.75rem', lineHeight: 1.6, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Are you sure you want to remove <strong style={{ color: 'var(--text-primary)' }}>&ldquo;{deviceName}&rdquo;</strong>?
          <div
            style={{
              marginTop: '0.85rem',
              padding: '0.85rem 1rem',
              borderRadius: '12px',
              background: 'rgba(244, 63, 94, 0.08)',
              border: '1px solid rgba(244, 63, 94, 0.2)',
              fontSize: '0.825rem',
              color: '#fca5a5',
            }}
          >
            This will permanently delete this hub&apos;s registered relays, automation rules, and historical telemetry data. Your ESP8266 controller will stop synchronizing until re-registered.
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn btn-secondary"
            style={{ padding: '0.7rem 1.35rem', borderRadius: '14px', fontWeight: 500 }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="btn"
            style={{
              padding: '0.7rem 1.6rem',
              borderRadius: '14px',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #e11d48, #be123c)',
              color: 'white',
              boxShadow: '0 4px 18px rgba(225, 29, 72, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Removing…</span>
              </>
            ) : (
              <>
                <Trash2 size={16} />
                <span>Remove Hub</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
