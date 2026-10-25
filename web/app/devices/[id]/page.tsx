'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Cpu, Wifi, RefreshCw, AlertCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import DeviceLiveTiles from '@/components/DeviceLiveTiles';
import RelayControlList from '@/components/RelayControlList';
import IntensitySlider from '@/components/IntensitySlider';
import AutomationSettings from '@/components/AutomationSettings';
import CalibrationPanel from '@/components/CalibrationPanel';
import EventsFeed from '@/components/EventsFeed';
import HourlyCharts from '@/components/HourlyCharts';

import { Device, Relay, DeviceEvent, SensorBlob, DeviceConfig, DeviceCalibration, DeviceState, RelayCategory } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

export default function DeviceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const deviceId = (params?.id as string) || 'demo-hub-living-room';

  const [device, setDevice] = useState<Device | null>(null);
  const [relays, setRelays] = useState<Relay[]>([]);
  const [events, setEvents] = useState<DeviceEvent[]>([]);
  const [blobs, setBlobs] = useState<SensorBlob[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();
  const channelRef = useRef<any>(null);

  // Initialize and load device data
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        // 1. Fetch Device Record
        const { data: devData } = await supabase
          .from('devices')
          .select('*')
          .eq('id', deviceId)
          .single();

        // 2. Fetch Relays
        const { data: relData } = await supabase
          .from('relays')
          .select('*')
          .eq('device_id', deviceId)
          .order('relay_index', { ascending: true });

        // 3. Fetch Recent Events
        const { data: evData } = await supabase
          .from('events')
          .select('*')
          .eq('device_id', deviceId)
          .order('created_at', { ascending: false })
          .limit(20);

        // 4. Fetch Recent Hourly Blobs
        const { data: blobData } = await supabase
          .from('sensor_blobs')
          .select('*')
          .eq('device_id', deviceId)
          .order('hour_start', { ascending: false })
          .limit(5);

        if (!isMounted) return;

        if (devData) {
          setDevice(devData);
          setIsOnline(Date.now() - new Date(devData.last_seen).getTime() < 60000);
        } else {
          // Fallback demo state
          setDevice({
            id: deviceId,
            owner_id: 'demo-user',
            name: 'Living Room Hub',
            token_hash: 'demo-hash',
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
          });
        }

        if (relData && relData.length > 0) {
          setRelays(relData);
        } else {
          // Default 4 relays per specification
          setRelays([
            { id: '1', device_id: deviceId, relay_index: 0, label: 'Light A', category: 'light', state: true, updated_at: new Date().toISOString() },
            { id: '2', device_id: deviceId, relay_index: 1, label: 'Light B', category: 'light', state: true, updated_at: new Date().toISOString() },
            { id: '3', device_id: deviceId, relay_index: 2, label: 'Main Plug', category: 'plug', state: false, updated_at: new Date().toISOString() },
            { id: '4', device_id: deviceId, relay_index: 3, label: 'Single Light', category: 'light', state: true, updated_at: new Date().toISOString() },
          ]);
        }

        if (evData && evData.length > 0) {
          setEvents(evData);
        } else {
          setEvents([
            { id: 101, device_id: deviceId, type_code: 1, value: 175.5, metadata: { band: 'Average adult' }, created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString() },
            { id: 102, device_id: deviceId, type_code: 5, value: 0, metadata: { state: true, source: 'automation_light' }, created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString() },
            { id: 103, device_id: deviceId, type_code: 1, value: 161.0, metadata: { band: 'Average adult' }, created_at: new Date(Date.now() - 1000 * 60 * 8).toISOString() },
            { id: 104, device_id: deviceId, type_code: 3, value: 7.2, metadata: { accel_spike: 7.2 }, created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
            { id: 105, device_id: deviceId, type_code: 4, value: 3, metadata: { switch_index: 3 }, created_at: new Date(Date.now() - 1000 * 60 * 2).toISOString() },
          ]);
        }

        if (blobData) {
          setBlobs(blobData);
        }
      } catch (err) {
        console.error('Data load exception:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    // Set up Supabase Realtime Channel
    try {
      const channel = supabase.channel(`device:${deviceId}`, {
        config: { broadcast: { self: false } },
      });

      // Listen for ESP8266 periodic and on-change state snapshots
      channel.on('broadcast', { event: 'state' }, (payload: any) => {
        if (!payload?.payload) return;
        const st: DeviceState = payload.payload;

        setDevice((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            last_state: { ...prev.last_state, ...st },
            last_seen: new Date().toISOString(),
          };
        });

        setIsOnline(true);

        // Update relays array
        if (st.relays && Array.isArray(st.relays)) {
          setRelays((prev) =>
            prev.map((r, idx) => ({
              ...r,
              state: st.relays[idx] !== undefined ? st.relays[idx] : r.state,
            }))
          );
        }
      });

      // Listen for discrete device events (entries, exits, knocks, switches)
      channel.on('broadcast', { event: 'device_event' }, (payload: any) => {
        if (!payload?.payload) return;
        const newEv: DeviceEvent = {
          id: Date.now(),
          device_id: deviceId,
          type_code: payload.payload.type_code,
          value: payload.payload.value,
          metadata: payload.payload.metadata || {},
          created_at: new Date().toISOString(),
        };

        setEvents((prev) => [newEv, ...prev.slice(0, 30)]);
      });

      channel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          // Channel connected
        }
      });

      channelRef.current = channel;
    } catch (err) {
      console.warn('Realtime subscription fallback:', err);
    }

    return () => {
      isMounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [deviceId]);

  // Command Senders over Realtime Channel
  const sendRealtimeCommand = (payload: any) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'command',
        payload,
      });
    }
  };

  // 1. Relay Toggle Handler (with Optimistic UI)
  const handleToggleRelay = async (index: number, newState: boolean) => {
    // Optimistic UI update
    setRelays((prev) =>
      prev.map((r) => (r.relay_index === index ? { ...r, state: newState } : r))
    );

    // Broadcast command to ESP8266 over channel
    sendRealtimeCommand({
      action: 'SET_RELAY',
      index,
      state: newState,
    });

    // Update database record
    await supabase
      .from('relays')
      .update({ state: newState, updated_at: new Date().toISOString() })
      .eq('device_id', deviceId)
      .eq('relay_index', index);
  };

  // 2. Intensity Slider Handler
  const handleChangeIntensity = (level: number) => {
    setDevice((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        last_state: { ...prev.last_state, intensity: level },
      };
    });

    // Update Light A and Light B relays optimistically
    const targetA = level > 0 && level <= 40 ? true : level > 70;
    const targetB = level > 40;

    setRelays((prev) =>
      prev.map((r) => {
        if (r.relay_index === 0) return { ...r, state: targetA };
        if (r.relay_index === 1) return { ...r, state: targetB };
        return r;
      })
    );

    sendRealtimeCommand({
      action: 'SET_INTENSITY',
      level,
    });
  };

  // 3. Automation Config Save Handler
  const handleSaveConfig = async (newConfig: DeviceConfig) => {
    setDevice((prev) => (prev ? { ...prev, config: newConfig } : prev));

    sendRealtimeCommand({
      action: 'SET_CONFIG',
      ...newConfig,
    });

    await supabase
      .from('devices')
      .update({ config: newConfig })
      .eq('id', deviceId);
  };

  // 4. Update Relay Label / Category
  const handleUpdateRelayMeta = async (index: number, newLabel: string, newCategory: RelayCategory) => {
    setRelays((prev) =>
      prev.map((r) =>
        r.relay_index === index ? { ...r, label: newLabel, category: newCategory } : r
      )
    );

    await supabase
      .from('relays')
      .update({ label: newLabel, category: newCategory })
      .eq('device_id', deviceId)
      .eq('relay_index', index);
  };

  // 5. Calibration Trigger Handlers
  const handleStartCalibrationStep = (stepNumber: number, param?: number) => {
    sendRealtimeCommand({
      action: 'START_CALIBRATION',
      step: stepNumber,
      param: param || 0,
    });
  };

  const handleCancelCalibration = () => {
    sendRealtimeCommand({ action: 'CANCEL_CALIBRATION' });
  };

  const handleToggleDirectionFlip = async () => {
    if (!device) return;
    const nextFlipped = !device.calibration.direction_flipped;
    const updatedCal: DeviceCalibration = {
      ...device.calibration,
      direction_flipped: nextFlipped,
    };

    setDevice({ ...device, calibration: updatedCal });

    sendRealtimeCommand({
      action: 'SET_CALIBRATION',
      direction_flipped: nextFlipped,
    });

    await supabase
      .from('devices')
      .update({ calibration: updatedCal })
      .eq('id', deviceId);
  };

  const handleStopOverride = () => {
    setDevice((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        last_state: {
          ...prev.last_state,
          manual_override: false,
          override_remaining_sec: 0,
        },
      };
    });

    sendRealtimeCommand({ action: 'STOP_OVERRIDE' });
  };

  if (loading || !device) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="brand-icon" style={{ width: '48px', height: '48px', margin: '0 auto 1rem auto' }}>
            <Cpu size={28} />
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>Connecting to device channel...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '4rem' }}>
      <Navbar />

      <main className="container" style={{ marginTop: '2rem' }}>
        {/* Breadcrumb & Navigation */}
        <div style={{ marginBottom: '1.5rem' }}>
          <Link href="/" className="btn btn-ghost" style={{ paddingLeft: 0, fontSize: '0.85rem' }}>
            <ArrowLeft size={16} />
            <span>Back to All Devices</span>
          </Link>
        </div>

        {/* Device Command Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="brand-icon" style={{ width: '48px', height: '48px' }}>
              <Cpu size={26} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                {device.name}
              </h1>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                Persistent Channel: <code style={{ color: 'var(--accent-cyan)' }}>device:{device.id}</code> • Low Latency (100–200ms)
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className={`badge ${isOnline ? 'badge-online' : 'badge-offline'}`}>
              <span className={`status-dot ${isOnline ? 'online' : 'offline'}`} />
              {isOnline ? 'Device Live (WebSocket)' : 'Offline / Reconnecting'}
            </span>
          </div>
        </div>

        {/* 1. Live Sensor Tiles */}
        <DeviceLiveTiles
          state={device.last_state}
          isOnline={isOnline}
          lastSeenTime={device.last_seen}
        />

        {/* 2. Main Dashboard Two-Column Grid */}
        <div className="main-dashboard-grid">
          {/* Left Column: Direct Controls & Settings */}
          <div>
            {/* Relays List */}
            <RelayControlList
              relays={relays}
              overrideActive={device.last_state.manual_override}
              overrideRemainingSec={device.last_state.override_remaining_sec}
              onToggleRelay={handleToggleRelay}
              onUpdateRelayMeta={handleUpdateRelayMeta}
              onStopOverride={handleStopOverride}
            />

            {/* Intensity Mode Slider */}
            <IntensitySlider
              intensity={device.last_state.intensity || 0}
              onChangeIntensity={handleChangeIntensity}
            />

            {/* Automation Rules */}
            <AutomationSettings
              config={device.config}
              onSaveConfig={handleSaveConfig}
            />

            {/* Guided Calibration Panel */}
            <CalibrationPanel
              calibration={device.calibration}
              onStartStep={handleStartCalibrationStep}
              onCancelCalibration={handleCancelCalibration}
              onToggleDirectionFlip={handleToggleDirectionFlip}
            />
          </div>

          {/* Right Column: Live Telemetry Feeds & Stored Blobs */}
          <div>
            {/* Live Events Stream */}
            <EventsFeed events={events} />

            {/* Hourly Sensor Blobs (360-Byte Bytea Visualizer) */}
            <HourlyCharts blobs={blobs} />
          </div>
        </div>
      </main>
    </div>
  );
}
