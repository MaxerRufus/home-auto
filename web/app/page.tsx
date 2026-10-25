'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { PlusCircle, Cpu, Wifi, Users, Thermometer, Zap, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import AddDeviceModal from '@/components/AddDeviceModal';
import { Device } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

export default function DashboardPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const supabase = createClient();

  const fetchDevices = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || null);
      }

      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        // Fallback demo device so the application is immediately interactive and demonstrable
        setDevices([
          {
            id: 'demo-hub-living-room',
            owner_id: user?.id || 'demo-user',
            name: 'Living Room Hub (Demo)',
            token_hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
            config: {
              light_threshold: 35,
              temp_threshold: 28,
              auto_lights: true,
              auto_plug: true,
              light_off_delay_sec: 180,
              temp_hysteresis: 2.0,
            },
            calibration: {
              dark_baseline: 50,
              daylight_baseline: 850,
              light_a_contrib: 120,
              light_b_contrib: 150,
              both_contrib: 280,
              accel_rest: 9.8,
              knock_threshold: 6.0,
              floor_dist_a: 220.0,
              floor_dist_b: 220.0,
              height_offset: 0.0,
              direction_flipped: false,
            },
            last_state: {
              occupancy: 2,
              temperature: 24.8,
              humidity: 49.0,
              ambient_light: 65,
              intensity: 75,
              relays: [true, true, false, true],
              manual_override: false,
              override_remaining_sec: 0,
            },
            last_seen: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
        ]);
      } else {
        setDevices(data);
      }
    } catch {
      // In case of offline or demo environment
      setDevices([
        {
          id: 'demo-hub-living-room',
          owner_id: 'demo-user',
          name: 'Living Room Hub (Demo)',
          token_hash: 'mock-hash',
          config: {
            light_threshold: 35,
            temp_threshold: 28,
            auto_lights: true,
            auto_plug: true,
            light_off_delay_sec: 180,
            temp_hysteresis: 2.0,
          },
          calibration: {
            dark_baseline: 50,
            daylight_baseline: 850,
            light_a_contrib: 120,
            light_b_contrib: 150,
            both_contrib: 280,
            accel_rest: 9.8,
            knock_threshold: 6.0,
            floor_dist_a: 220.0,
            floor_dist_b: 220.0,
            height_offset: 0.0,
            direction_flipped: false,
          },
          last_state: {
            occupancy: 1,
            temperature: 24.5,
            humidity: 50.0,
            ambient_light: 55,
            intensity: 25,
            relays: [true, false, false, false],
            manual_override: false,
            override_remaining_sec: 0,
          },
          last_seen: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUserEmail(null);
    fetchDevices();
  };

  const isDeviceOnline = (lastSeenIso: string) => {
    try {
      const diffMs = Date.now() - new Date(lastSeenIso).getTime();
      return diffMs < 60000; // Online if seen in last 60 seconds
    } catch {
      return false;
    }
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '3rem' }}>
      <Navbar userEmail={userEmail} onSignOut={handleSignOut} />

      <main className="container" style={{ marginTop: '2.5rem' }}>
        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
              Connected Hub Devices
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              ESP8266 controller nodes, sensor telemetry, and live relay switches
            </p>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn btn-primary"
            style={{ padding: '0.65rem 1.25rem' }}
          >
            <PlusCircle size={18} />
            <span>Add New Device</span>
          </button>
        </div>

        {/* Device Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          {devices.map((device) => {
            const online = isDeviceOnline(device.last_seen);
            const activeRelayCount = device.last_state?.relays?.filter(Boolean).length || 0;

            return (
              <div
                key={device.id}
                className="glass-panel"
                style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="brand-icon" style={{ width: '40px', height: '40px' }}>
                        <Cpu size={22} />
                      </div>
                      <div>
                        <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>{device.name}</h2>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          ID: {device.id.slice(0, 18)}...
                        </span>
                      </div>
                    </div>

                    <span className={`badge ${online ? 'badge-online' : 'badge-offline'}`}>
                      <span className={`status-dot ${online ? 'online' : 'offline'}`} />
                      {online ? 'Online' : 'Offline'}
                    </span>
                  </div>

                  {/* Telemetry Metrics Snippet */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.02)',
                      padding: '1rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      marginBottom: '1.5rem',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Occupancy</span>
                      <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                        {device.last_state?.occupancy ?? 0}
                      </span>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Temperature</span>
                      <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-rose)' }}>
                        {device.last_state?.temperature ?? 24}°C
                      </span>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Relays ON</span>
                      <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-green)' }}>
                        {activeRelayCount} / 4
                      </span>
                    </div>
                  </div>
                </div>

                <Link
                  href={`/devices/${device.id}`}
                  className="btn btn-secondary"
                  style={{ width: '100%', justifyContent: 'space-between', padding: '0.65rem 1rem' }}
                >
                  <span style={{ fontWeight: 500 }}>Open Device Controls & Calibration</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            );
          })}
        </div>

        {/* Planned Features & Feasibility Notes Section */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
            <div className="tile-icon" style={{ color: 'var(--accent-cyan)' }}>
              <HelpCircle size={20} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Planned Features & Honest Feasibility Matrix</h2>
          </div>

          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            To adhere to the project principle of reliability and honest scope, here is the current engineering feasibility breakdown for requested roadmap items:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--accent-blue)', marginBottom: '0.35rem' }}>
                1. Visual Automation Builder
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <strong>Feasible:</strong> Stored as lightweight JSON triggers on Supabase, pushed over Realtime WebSocket, and parsed on the ESP8266.
              </p>
            </div>

            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--accent-green)', marginBottom: '0.35rem' }}>
                2. Energy-Saving Insights
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <strong>Needs Sensor:</strong> Requires ACS712 or PZEM-004T current sensing before claiming kilowatt-hour percentage savings.
              </p>
            </div>

            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--accent-purple)', marginBottom: '0.35rem' }}>
                3. Offline Machine Learning
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <strong>Feasible:</strong> Train logistic regression model offline on accumulated 360-byte hourly blobs to predict pre-warming schedules.
              </p>
            </div>
          </div>
        </div>
      </main>

      <AddDeviceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onDeviceCreated={fetchDevices}
      />
    </div>
  );
}
