'use client';

import React, { useState } from 'react';
import { PlusCircle, Key, Copy, Check, AlertTriangle, X, ShieldCheck, Code2, Sparkles } from 'lucide-react';

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeviceCreated: () => void;
}

export default function AddDeviceModal({ isOpen, onClose, onDeviceCreated }: AddDeviceModalProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdData, setCreatedData] = useState<{ id: string; token: string; name: string } | null>(null);
  const [copiedField, setCopiedField] = useState<'id' | 'token' | 'snippet' | null>(null);
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
        name: data.device.name || name.trim(),
      });
      // Do NOT call onDeviceCreated yet if it would trigger an unmount or full page spinner!
    } catch (err: any) {
      setError(err.message || 'Error creating device');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, field: 'id' | 'token' | 'snippet') => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleFinish = () => {
    onDeviceCreated();
    handleClose();
  };

  const handleClose = () => {
    setName('');
    setCreatedData(null);
    setError('');
    setCopiedField(null);
    onClose();
  };

  const cppSnippet = createdData
    ? `#define DEVICE_ID           "${createdData.id}"\n#define DEVICE_SECRET_TOKEN "${createdData.token}"`
    : '';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
          maxWidth: '600px',
          background: 'linear-gradient(145deg, rgba(17, 24, 39, 0.95), rgba(15, 23, 42, 0.98))',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 35px rgba(59, 130, 246, 0.15)',
          borderRadius: 'var(--radius-lg)',
          padding: '2rem',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: createdData
                  ? 'linear-gradient(135deg, var(--accent-green), #059669)'
                  : 'linear-gradient(135deg, var(--accent-blue), var(--accent-cyan))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: createdData
                  ? '0 0 20px rgba(16, 185, 129, 0.4)'
                  : '0 0 20px var(--accent-blue-glow)',
                transition: 'all 0.3s ease',
              }}
            >
              {createdData ? <ShieldCheck size={22} /> : <PlusCircle size={22} />}
            </div>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                {createdData ? 'Device Credentials' : 'Register New Hub'}
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {createdData ? `Controller: "${createdData.name}"` : 'ESP8266 NodeMCU Controller'}
              </span>
            </div>
          </div>

          <button
            onClick={createdData ? handleFinish : handleClose}
            className="btn btn-ghost btn-icon"
            style={{ borderRadius: '50%', width: '36px', height: '36px' }}
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '0.85rem 1rem',
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              borderRadius: 'var(--radius-sm)',
              color: '#fda4af',
              fontSize: '0.875rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {!createdData ? (
          /* Step 1: Input Name */
          <form onSubmit={handleCreate}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              Register your ESP8266 controller to this account. The backend will generate a unique <strong>Device UID</strong> and a cryptographically secure <strong>32-byte secret token</strong> for authenticating WebSocket and HTTP telemetry.
            </p>

            <div style={{ marginBottom: '1.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                Hub Device Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Living Room NodeMCU Hub"
                required
                autoFocus
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  padding: '0.85rem 1.15rem',
                  fontSize: '0.95rem',
                  cursor: 'text',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 'var(--radius-sm)',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" onClick={handleClose} className="btn btn-secondary" style={{ padding: '0.7rem 1.4rem' }}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{
                  padding: '0.7rem 1.75rem',
                  background: 'linear-gradient(135deg, var(--accent-blue), #1d4ed8)',
                  fontWeight: 600,
                }}
              >
                {loading ? 'Generating Credentials…' : 'Generate Credentials'}
              </button>
            </div>
          </form>
        ) : (
          /* Step 2: Credentials Display (Crucial!) */
          <div style={{ animation: 'fadeIn 0.25s ease' }}>
            {/* Warning Callout */}
            <div
              style={{
                padding: '1rem 1.15rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                marginBottom: '1.5rem',
                lineHeight: 1.5,
              }}
            >
              <AlertTriangle size={20} style={{ color: 'var(--accent-amber)', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Save your Secret Token now!</strong>
                <div style={{ marginTop: '3px' }}>
                  This clear secret token is shown <strong>only once</strong> upon creation. Supabase stores only its one-way SHA-256 hash. If you lose it, you will need to register a new device.
                </div>
              </div>
            </div>

            {/* Field 1: Device UID */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Device UID (DEVICE_ID)
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>UUID format</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  readOnly
                  value={createdData.id}
                  className="btn btn-secondary"
                  style={{
                    width: '100%',
                    fontSize: '0.85rem',
                    fontFamily: 'monospace',
                    padding: '0.75rem 1rem',
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'var(--accent-cyan)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(createdData.id, 'id')}
                  className="btn btn-secondary"
                  style={{
                    padding: '0 1.25rem',
                    gap: '0.4rem',
                    whiteSpace: 'nowrap',
                    borderColor: copiedField === 'id' ? 'var(--accent-green)' : undefined,
                  }}
                >
                  {copiedField === 'id' ? (
                    <>
                      <Check size={16} style={{ color: 'var(--accent-green)' }} />
                      <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Field 2: Secret Token */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Secret Token (DEVICE_SECRET_TOKEN)
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-amber)' }}>32-byte hex secret</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  readOnly
                  value={createdData.token}
                  className="btn btn-secondary"
                  style={{
                    width: '100%',
                    fontSize: '0.85rem',
                    fontFamily: 'monospace',
                    padding: '0.75rem 1rem',
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'var(--accent-amber)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(createdData.token, 'token')}
                  className="btn btn-secondary"
                  style={{
                    padding: '0 1.25rem',
                    gap: '0.4rem',
                    whiteSpace: 'nowrap',
                    borderColor: copiedField === 'token' ? 'var(--accent-green)' : undefined,
                  }}
                >
                  {copiedField === 'token' ? (
                    <>
                      <Check size={16} style={{ color: 'var(--accent-green)' }} />
                      <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Field 3: Arduino config.h C++ Snippet */}
            <div
              style={{
                marginBottom: '1.75rem',
                background: 'rgba(0, 0, 0, 0.45)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: 'var(--radius-sm)',
                padding: '1rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Code2 size={16} style={{ color: 'var(--accent-cyan)' }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Paste into firmware/SmartHomeHub/config.h (lines 20–21)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(cppSnippet, 'snippet')}
                  className="btn btn-ghost"
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.65rem',
                    color: copiedField === 'snippet' ? 'var(--accent-green)' : 'var(--accent-cyan)',
                  }}
                >
                  {copiedField === 'snippet' ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Check size={14} /> Snippet Copied!
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Copy size={14} /> Copy C++ Snippet
                    </span>
                  )}
                </button>
              </div>

              <pre
                style={{
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  color: '#e2e8f0',
                  background: 'rgba(0, 0, 0, 0.5)',
                  padding: '0.85rem 1rem',
                  borderRadius: '6px',
                  overflowX: 'auto',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  lineHeight: 1.6,
                }}
              >
                <code>{cppSnippet}</code>
              </pre>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Click Done after copying both values into config.h
              </span>
              <button
                type="button"
                onClick={handleFinish}
                className="btn btn-primary"
                style={{
                  padding: '0.75rem 2rem',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  background: 'linear-gradient(135deg, var(--accent-green), #059669)',
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.35)',
                }}
              >
                Done — I Have Saved My Credentials
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
