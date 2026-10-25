'use client';

import React, { useState } from 'react';
import { PlusCircle, Key, Copy, Check, AlertTriangle, X } from 'lucide-react';

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeviceCreated: () => void;
}

export default function AddDeviceModal({ isOpen, onClose, onDeviceCreated }: AddDeviceModalProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdData, setCreatedData] = useState<{ id: string; token: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/device/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create device');
      }

      setCreatedData({
        id: data.device.id,
        token: data.oneTimeSecretToken,
      });
      onDeviceCreated();
    } catch (err: any) {
      setError(err.message || 'Error creating device');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setName('');
    setCreatedData(null);
    setError('');
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div className="modal-content" style={{ width: '100%', maxWidth: '520px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div className="brand-icon" style={{ width: '32px', height: '32px' }}>
              <PlusCircle size={18} />
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>
              {createdData ? 'Device Registered!' : 'Add New Hub Device'}
            </h2>
          </div>

          <button onClick={handleClose} className="btn btn-ghost btn-icon">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid var(--accent-rose)', borderRadius: 'var(--radius-sm)', color: '#f87171', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {!createdData ? (
          <form onSubmit={handleCreate}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Assign a name to your ESP8266 controller. A cryptographically secure 32-byte secret token will be generated for device authentication.
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                Device Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Living Room Hub"
                required
                className="btn btn-secondary"
                style={{ width: '100%', padding: '0.75rem 1rem', fontSize: '0.95rem', cursor: 'text' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" onClick={handleClose} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn btn-primary">
                {loading ? 'Generating...' : 'Register Device'}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div
              style={{
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.65rem',
                fontSize: '0.825rem',
                color: 'var(--accent-amber)',
                marginBottom: '1.25rem',
              }}
            >
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>One-Time Secret Token:</strong> This clear token will never be displayed again. Only its SHA-256 hash is retained in Supabase. Copy it into your ESP8266 firmware <code style={{ color: 'white' }}>config.h</code> now.
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Device UUID (DEVICE_ID)
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  readOnly
                  value={createdData.id}
                  className="btn btn-secondary"
                  style={{ width: '100%', fontSize: '0.8rem', fontFamily: 'monospace' }}
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(createdData.id)}
                  className="btn btn-secondary btn-icon"
                  title="Copy Device ID"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Secret Token (DEVICE_SECRET_TOKEN)
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  readOnly
                  value={createdData.token}
                  className="btn btn-secondary"
                  style={{ width: '100%', fontSize: '0.8rem', fontFamily: 'monospace' }}
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(createdData.token)}
                  className="btn btn-primary btn-icon"
                  title="Copy Secret Token"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={handleClose} className="btn btn-primary">
                Done & Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
