'use client';

import React, { useState } from 'react';
import {
  GitBranch,
  Play,
  CheckCircle2,
  Sliders,
  Sun,
  Thermometer,
  Users,
  Zap,
  Clock,
  Plus,
  Trash2,
  Save,
  ArrowRight,
  Sparkles,
  ToggleLeft
} from 'lucide-react';
import { DeviceConfig } from '@/lib/types';

export interface AutomationNode {
  id: string;
  type: 'trigger' | 'condition' | 'action';
  category: 'occupancy' | 'light' | 'temp' | 'switch' | 'relay' | 'delay' | 'intensity';
  label: string;
  params: Record<string, any>;
}

export interface AutomationFlow {
  id: string;
  name: string;
  enabled: boolean;
  nodes: AutomationNode[];
}

interface NodeAutomationBuilderProps {
  config: DeviceConfig;
  onSaveConfig: (newConfig: DeviceConfig) => void;
}

const DEFAULT_FLOWS: AutomationFlow[] = [
  {
    id: 'flow-1',
    name: 'Auto-Lighting on Occupancy',
    enabled: true,
    nodes: [
      {
        id: 'node-t1',
        type: 'trigger',
        category: 'occupancy',
        label: 'Person Enters Room (Occupancy > 0)',
        params: { operator: '>', value: 0 },
      },
      {
        id: 'node-c1',
        type: 'condition',
        category: 'light',
        label: 'Ambient Light < 35% (Dark Room)',
        params: { threshold: 35 },
      },
      {
        id: 'node-a1',
        type: 'action',
        category: 'relay',
        label: 'Turn ON Light A & Light B',
        params: { relay0: true, relay1: true },
      },
    ],
  },
  {
    id: 'flow-2',
    name: 'Auto-Cooling Fan Threshold',
    enabled: true,
    nodes: [
      {
        id: 'node-t2',
        type: 'trigger',
        category: 'temp',
        label: 'Temperature ≥ 28.0°C (DHT11)',
        params: { temp: 28.0 },
      },
      {
        id: 'node-c2',
        type: 'condition',
        category: 'occupancy',
        label: 'Room is Occupied',
        params: { minOccupancy: 1 },
      },
      {
        id: 'node-a2',
        type: 'action',
        category: 'relay',
        label: 'Turn ON Fan (Relay 2)',
        params: { relay2: true },
      },
    ],
  },
  {
    id: 'flow-3',
    name: 'Empty Room Energy Saver',
    enabled: true,
    nodes: [
      {
        id: 'node-t3',
        type: 'trigger',
        category: 'occupancy',
        label: 'Occupancy Reaches 0 (Room Empty)',
        params: { operator: '==', value: 0 },
      },
      {
        id: 'node-c3',
        type: 'condition',
        category: 'delay',
        label: 'Wait 180s (3-Minute Grace Period)',
        params: { delaySec: 180 },
      },
      {
        id: 'node-a3',
        type: 'action',
        category: 'relay',
        label: 'Turn OFF All Relays',
        params: { allOff: true },
      },
    ],
  },
];

export default function NodeAutomationBuilder({ config, onSaveConfig }: NodeAutomationBuilderProps) {
  const [flows, setFlows] = useState<AutomationFlow[]>(DEFAULT_FLOWS);
  const [selectedFlowId, setSelectedFlowId] = useState<string>(DEFAULT_FLOWS[0].id);
  const [synced, setSynced] = useState(false);

  const activeFlow = flows.find((f) => f.id === selectedFlowId) || flows[0];

  const handleToggleFlow = (id: string) => {
    setFlows((prev) =>
      prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f))
    );
  };

  const handleSaveAll = () => {
    // Map flow thresholds back into the hardware DeviceConfig
    const lightRule = flows.find((f) => f.id === 'flow-1');
    const tempRule = flows.find((f) => f.id === 'flow-2');

    const updatedConfig: DeviceConfig = {
      ...config,
      auto_lights: lightRule ? lightRule.enabled : config.auto_lights,
      auto_plug: tempRule ? tempRule.enabled : config.auto_plug,
    };

    onSaveConfig(updatedConfig);
    setSynced(true);
    setTimeout(() => setSynced(false), 2500);
  };

  const getNodeIcon = (category: string) => {
    switch (category) {
      case 'occupancy':
        return <Users size={16} style={{ color: 'var(--accent-cyan)' }} />;
      case 'light':
        return <Sun size={16} style={{ color: 'var(--accent-amber)' }} />;
      case 'temp':
        return <Thermometer size={16} style={{ color: 'var(--accent-rose)' }} />;
      case 'relay':
        return <Zap size={16} style={{ color: 'var(--accent-green)' }} />;
      case 'delay':
        return <Clock size={16} style={{ color: 'var(--accent-purple)' }} />;
      default:
        return <Sliders size={16} />;
    }
  };

  const getNodeBadgeColor = (type: string) => {
    switch (type) {
      case 'trigger':
        return { bg: 'rgba(59, 130, 246, 0.15)', text: 'var(--accent-blue)', border: 'rgba(59, 130, 246, 0.3)' };
      case 'condition':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: 'var(--accent-amber)', border: 'rgba(245, 158, 11, 0.3)' };
      case 'action':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: 'var(--accent-green)', border: 'rgba(16, 185, 129, 0.3)' };
      default:
        return { bg: 'rgba(255, 255, 255, 0.1)', text: 'white', border: 'transparent' };
    }
  };

  return (
    <div style={{ marginTop: '1rem' }}>
      {/* Flow Selector Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {flows.map((flow) => (
            <button
              key={flow.id}
              onClick={() => setSelectedFlowId(flow.id)}
              className={`btn ${selectedFlowId === flow.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                fontSize: '0.8rem',
                padding: '0.4rem 0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: flow.enabled ? 'var(--accent-green)' : 'var(--text-muted)',
                }}
              />
              <span>{flow.name}</span>
            </button>
          ))}
        </div>

        <button
          onClick={handleSaveAll}
          className="btn btn-primary"
          style={{
            fontSize: '0.85rem',
            padding: '0.45rem 1rem',
            background: 'linear-gradient(135deg, var(--accent-green), #059669)',
            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
          }}
        >
          <Save size={15} />
          <span>{synced ? 'Synced to ESP8266!' : 'Save & Sync Flow'}</span>
        </button>
      </div>

      {/* Visual Flow Canvas */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '1.5rem',
          position: 'relative',
          overflowX: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <GitBranch size={18} style={{ color: 'var(--accent-cyan)' }} />
              {activeFlow.name}
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Hardware node pipeline evaluated autonomously inside ESP8266 RAM
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: activeFlow.enabled ? 'var(--accent-green)' : 'var(--text-muted)', fontWeight: 600 }}>
              {activeFlow.enabled ? 'RULE ACTIVE' : 'RULE PAUSED'}
            </span>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={activeFlow.enabled}
                onChange={() => handleToggleFlow(activeFlow.id)}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>

        {/* Nodes Sequence Cards */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            minWidth: '650px',
            padding: '0.5rem 0',
          }}
        >
          {activeFlow.nodes.map((node, idx) => {
            const badge = getNodeBadgeColor(node.type);

            return (
              <React.Fragment key={node.id}>
                {/* Node Box */}
                <div
                  style={{
                    flex: '1',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '1rem 1.15rem',
                    boxShadow: 'var(--shadow-sm)',
                    position: 'relative',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Step Type Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        background: badge.bg,
                        color: badge.text,
                        border: `1px solid ${badge.border}`,
                        letterSpacing: '0.04em',
                      }}
                    >
                      Step {idx + 1}: {node.type}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {getNodeIcon(node.category)}
                    </div>
                  </div>

                  {/* Node Label */}
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem', lineHeight: 1.4 }}>
                    {node.label}
                  </h4>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {node.type === 'trigger' && 'Fires upon sensor edge crossing'}
                    {node.type === 'condition' && 'Validates room context before action'}
                    {node.type === 'action' && 'Signals hardware relay via I2C PCF8574'}
                  </div>
                </div>

                {/* Arrow Connector */}
                {idx < activeFlow.nodes.length - 1 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-cyan)',
                      opacity: 0.8,
                      flexShrink: 0,
                    }}
                  >
                    <ArrowRight size={22} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Node Pipeline Description */}
        <div
          style={{
            marginTop: '1.5rem',
            padding: '0.85rem 1rem',
            borderRadius: '6px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Sparkles size={16} style={{ color: 'var(--accent-amber)', flexShrink: 0 }} />
          <span>
            <strong>Edge Automation Principle:</strong> Rules run directly in the ESP8266 event loop with zero cloud round-trip delay. Even if your internet connection drops, lights and cooling still respond instantly.
          </span>
        </div>
      </div>
    </div>
  );
}
