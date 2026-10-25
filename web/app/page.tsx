'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  PlusCircle,
  Cpu,
  ArrowRight,
  HelpCircle,
  LogIn,
  Wifi,
  WifiOff,
  Sparkles,
  RefreshCw,
  Trash2,
  Moon,
  Sun,
  Flame,
  Zap,
  Activity,
  Layers,
  Power
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import AddDeviceModal from '@/components/AddDeviceModal';
import DeleteDeviceModal from '@/components/DeleteDeviceModal';
import { Device } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

export default function DashboardPage() {
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<{ id: string; name: string } | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeScene, setActiveScene] = useState<string>('all');

  const supabase = createClient();

  const fetchDevices = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setIsAuthenticated(false);
        setDevices([]);
        return;
      }

      setIsAuthenticated(true);
      setUserEmail(user.email || null);

      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch devices:', error.message);
        setDevices([]);
      } else {
        setDevices(data ?? []);
      }
    } catch (err) {
      console.error('Unexpected error fetching devices:', err);
      setDevices([]);
    } finally {
      if (isInitial) setLoading(false);
      setRefreshing(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchDevices(true);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setIsAuthenticated(true);
        setUserEmail(session.user.email ?? null);
        fetchDevices(false);
      } else {
        setIsAuthenticated(false);
        setUserEmail(null);
        setDevices([]);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchDevices, supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUserEmail(null);
    setIsAuthenticated(false);
    setDevices([]);
  };

  const isDeviceOnline = (lastSeenIso?: string | null) => {
    if (!lastSeenIso) return false;
    try {
      const diffMs = Date.now() - new Date(lastSeenIso).getTime();
      return diffMs < 60000;
    } catch {
      return false;
    }
  };

  // Compute Hume smart stats
  const onlineCount = useMemo(() => {
    return devices.filter((d) => isDeviceOnline(d.last_seen)).length;
  }, [devices]);

  const activeRelayTotal = useMemo(() => {
    return devices.reduce((acc, dev) => {
      if (!isDeviceOnline(dev.last_seen) || !dev.last_state?.relays) return acc;
      return acc + dev.last_state.relays.filter(Boolean).length;
    }, 0);
  }, [devices]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good morning', icon: <Sun size={18} style={{ color: 'var(--accent-amber)' }} /> };
    if (hour < 18) return { text: 'Good afternoon', icon: <Sun size={18} style={{ color: 'var(--accent-orange)' }} /> };
    return { text: 'Good evening', icon: <Moon size={18} style={{ color: 'var(--accent-purple)' }} /> };
  }, []);

  const displayName = userEmail ? userEmail.split('@')[0] : 'Resident';

  // ── Not signed in ────────────────────────────────────────────────────────────
  if (!loading && !isAuthenticated) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '2rem',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <div
          className="brand-icon"
          style={{
            width: '68px',
            height: '68px',
            margin: '0 auto',
            borderRadius: '22px',
            background: 'linear-gradient(135deg, var(--accent-orange), #ea580c)',
            boxShadow: '0 0 40px var(--accent-orange-glow)',
          }}
        >
          <Cpu size={38} />
        </div>
        <div style={{ maxWidth: '440px' }}>
          <h1 style={{ fontSize: '2.1rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
            Hume Smart Home
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6 }}>
            Sign in to access real-time ESP8266 telemetry, live appliance switches, and automated rules.
          </p>
        </div>
        <Link
          href="/login"
          className="btn btn-hume"
          style={{
            padding: '0.85rem 2.6rem',
            fontSize: '1rem',
            borderRadius: '16px',
          }}
        >
          <LogIn size={20} />
          <span>Sign In to Dashboard</span>
        </Link>
      </div>
    );
  }

  // ── Initial Loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Navbar userEmail={userEmail} onSignOut={handleSignOut} />
        <main className="container" style={{ marginTop: '5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <div
              className="brand-icon"
              style={{
                width: '52px',
                height: '52px',
                margin: '0 auto 1.25rem',
                borderRadius: '18px',
                background: 'linear-gradient(135deg, var(--accent-orange), #ea580c)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            >
              <Cpu size={28} />
            </div>
            <p style={{ fontSize: '0.95rem', fontWeight: 500 }}>Connecting to Hume Smart Hub…</p>
          </div>
        </main>
      </div>
    );
  }

  // ── Authenticated Hume Dashboard ─────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', paddingBottom: '4rem' }}>
      <Navbar userEmail={userEmail} onSignOut={handleSignOut} />

      <main className="container" style={{ marginTop: '2.25rem' }}>
        {/* Hume Smart Home Atmosphere Top Header */}
        <div
          style={{
            background: 'var(--bg-card)',
            borderRadius: '28px',
            border: '1px solid var(--border-color)',
            padding: '2rem 2.25rem',
            marginBottom: '2.5rem',
            boxShadow: 'var(--shadow-lg)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle warm glow orb */}
          <div
            style={{
              position: 'absolute',
              top: '-60px',
              right: '-40px',
              width: '240px',
              height: '240px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255, 107, 53, 0.18) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', position: 'relative' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>
                {greeting.icon}
                <span>{greeting.text},</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{displayName}</span>
              </div>
              <h1 style={{ fontSize: '2.1rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
                Smart Living Spaces
              </h1>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                {devices.length === 0
                  ? 'No controllers registered yet'
                  : `${onlineCount} of ${devices.length} hub${devices.length > 1 ? 's' : ''} live • ${activeRelayTotal} appliance${activeRelayTotal !== 1 ? 's' : ''} running`}
              </p>
            </div>

            {/* Header Action Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => fetchDevices(false)}
                className="btn btn-secondary"
                title="Refresh status"
                style={{ padding: '0.7rem 1.15rem', borderRadius: '16px' }}
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="btn btn-hume"
                style={{
                  padding: '0.7rem 1.6rem',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                }}
              >
                <PlusCircle size={19} />
                <span>Add Hub Device</span>
              </button>
            </div>
          </div>

          {/* Quick Scene Mode Pills */}
          <div
            style={{
              display: 'flex',
              gap: '0.65rem',
              marginTop: '1.75rem',
              flexWrap: 'wrap',
              borderTop: '1px solid var(--border-color)',
              paddingTop: '1.25rem',
            }}
          >
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', marginRight: '0.25rem' }}>
              Quick Scene:
            </span>
            <button
              onClick={() => setActiveScene('all')}
              className={`hume-scene-pill ${activeScene === 'all' ? 'active' : ''}`}
            >
              <Layers size={14} />
              <span>All Hubs</span>
            </button>
            <button
              onClick={() => setActiveScene('active')}
              className={`hume-scene-pill ${activeScene === 'active' ? 'active' : ''}`}
            >
              <Zap size={14} />
              <span>Active Devices ({activeRelayTotal})</span>
            </button>
            <button
              onClick={() => setActiveScene('online')}
              className={`hume-scene-pill ${activeScene === 'online' ? 'active' : ''}`}
            >
              <Wifi size={14} />
              <span>Online Nodes ({onlineCount})</span>
            </button>
          </div>
        </div>

        {/* Device Cards Section */}
        {devices.length === 0 ? (
          <div
            className="glass-panel"
            style={{
              padding: '4rem 2rem',
              textAlign: 'center',
              marginBottom: '2.5rem',
              background: 'var(--bg-card)',
              borderRadius: '24px',
              border: '1px solid var(--border-color)',
            }}
          >
            <div
              className="hume-icon-box"
              style={{
                width: '64px',
                height: '64px',
                margin: '0 auto 1.25rem',
                borderRadius: '20px',
                background: 'rgba(255, 107, 53, 0.12)',
                color: 'var(--accent-orange)',
                border: '1px solid rgba(255, 107, 53, 0.3)',
              }}
            >
              <Cpu size={32} />
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              No Smart Hubs Registered Yet
            </h2>
            <p
              style={{
                fontSize: '0.925rem',
                color: 'var(--text-secondary)',
                marginBottom: '1.75rem',
                maxWidth: '480px',
                margin: '0 auto 1.75rem auto',
                lineHeight: 1.6,
              }}
            >
              Click <strong>Add Hub Device</strong> to register your ESP8266 controller. You will receive a unique Device UID and Secret Token to paste into your Arduino firmware <code>config.h</code>.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="btn btn-hume"
              style={{ padding: '0.8rem 2.2rem', borderRadius: '16px' }}
            >
              <PlusCircle size={18} />
              <span>Register First Hub</span>
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: '1.75rem',
              marginBottom: '3rem',
            }}
          >
            {devices
              .filter((dev) => {
                if (activeScene === 'online') return isDeviceOnline(dev.last_seen);
                if (activeScene === 'active') {
                  return isDeviceOnline(dev.last_seen) && dev.last_state?.relays?.some(Boolean);
                }
                return true;
              })
              .map((device) => {
                const online = isDeviceOnline(device.last_seen);
                const activeRelayCount =
                  online && device.last_state?.relays
                    ? device.last_state.relays.filter(Boolean).length
                    : 0;

                return (
                  <div
                    key={device.id}
                    className={`hume-device-card ${online ? 'is-online' : ''}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '280px',
                    }}
                  >
                    <div>
                      {/* Card Top: Icon, Name, Delete action, Online badge */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '1.4rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <div
                            className="hume-icon-box"
                            style={{
                              background: online
                                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.3))'
                                : 'linear-gradient(135deg, rgba(255, 107, 53, 0.12), rgba(234, 88, 12, 0.18))',
                              color: online ? 'var(--accent-green)' : 'var(--accent-orange)',
                              border: online
                                ? '1px solid rgba(16, 185, 129, 0.35)'
                                : '1px solid rgba(255, 107, 53, 0.3)',
                              boxShadow: online
                                ? '0 0 16px rgba(16, 185, 129, 0.25)'
                                : 'none',
                            }}
                          >
                            <Cpu size={24} />
                          </div>
                          <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
                              {device.name}
                            </h2>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-muted)',
                                fontFamily: 'monospace',
                              }}
                            >
                              UID: {device.id.slice(0, 14)}…
                            </span>
                          </div>
                        </div>

                        {/* Top Right: Status Badge & Delete Button */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span
                            className={`badge ${online ? 'badge-online' : 'badge-offline'}`}
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: '9999px' }}
                          >
                            <span className={`status-dot ${online ? 'online' : 'offline'}`} />
                            {online ? 'Online' : 'Offline'}
                          </span>

                          {/* Hume Delete Option */}
                          <button
                            onClick={() => setDeviceToDelete({ id: device.id, name: device.name })}
                            className="btn-danger-ghost"
                            title="Remove hub device"
                            aria-label={`Remove ${device.name}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Telemetry Metrics Snippet - NO FALSE VALUES */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: '0.75rem',
                          background: 'var(--bg-secondary)',
                          padding: '1rem 1.15rem',
                          borderRadius: '16px',
                          border: '1px solid var(--border-color)',
                          marginBottom: '1.5rem',
                        }}
                      >
                        <div>
                          <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Occupancy
                          </span>
                          <span
                            style={{
                              fontSize: '1.25rem',
                              fontWeight: 700,
                              color: online ? 'var(--accent-cyan)' : 'var(--text-muted)',
                            }}
                          >
                            {online && device.last_state?.occupancy != null
                              ? `${device.last_state.occupancy}`
                              : '—'}
                          </span>
                        </div>

                        <div>
                          <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Temperature
                          </span>
                          <span
                            style={{
                              fontSize: '1.25rem',
                              fontWeight: 700,
                              color: online ? 'var(--accent-rose)' : 'var(--text-muted)',
                            }}
                          >
                            {online && typeof device.last_state?.temperature === 'number'
                              ? `${device.last_state.temperature.toFixed(1)}°C`
                              : '—'}
                          </span>
                        </div>

                        <div>
                          <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Relays ON
                          </span>
                          <span
                            style={{
                              fontSize: '1.25rem',
                              fontWeight: 700,
                              color: online && activeRelayCount > 0 ? 'var(--accent-orange)' : 'var(--text-muted)',
                            }}
                          >
                            {online ? `${activeRelayCount} / 4` : '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action: Open Device Controls */}
                    <Link
                      href={`/devices/${device.id}`}
                      className="btn btn-secondary"
                      style={{
                        width: '100%',
                        justifyContent: 'space-between',
                        padding: '0.8rem 1.25rem',
                        borderRadius: '16px',
                        fontWeight: 600,
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      <span style={{ fontSize: '0.9rem' }}>Open Device Controls</span>
                      <ArrowRight size={17} />
                    </Link>
                  </div>
                );
              })}
          </div>
        )}

        {/* Quick Setup Card */}
        <div
          className="glass-panel"
          style={{
            padding: '2.25rem',
            borderRadius: '24px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem' }}>
            <div
              className="hume-icon-box"
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(59, 130, 246, 0.12)',
                color: 'var(--accent-blue)',
              }}
            >
              <HelpCircle size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Connecting Your Hardware</h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Fast 3-step setup with ESP8266 & Supabase Realtime
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1.25rem',
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
            }}
          >
            <div style={{ background: 'var(--bg-secondary)', padding: '1.15rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.35rem' }}>
                1. Register Hub Device
              </strong>
              Click <strong>Add Hub Device</strong> above to generate your unique Device UID and 32-byte secret token.
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: '1.15rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.35rem' }}>
                2. Paste into config.h
              </strong>
              Copy the C++ config snippet directly into <code>firmware/SmartHomeHub/config.h</code> lines 20–21.
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: '1.15rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.35rem' }}>
                3. Flash ESP8266 & Live Sync
              </strong>
              Flash your NodeMCU via Arduino IDE. The hub authenticates immediately and turns <strong>Online</strong> within 5 seconds.
            </div>
          </div>
        </div>
      </main>

      <AddDeviceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onDeviceCreated={() => fetchDevices(false)}
      />

      <DeleteDeviceModal
        isOpen={!!deviceToDelete}
        deviceId={deviceToDelete?.id ?? null}
        deviceName={deviceToDelete?.name ?? ''}
        onClose={() => setDeviceToDelete(null)}
        onSuccess={() => fetchDevices(false)}
      />
    </div>
  );
}
