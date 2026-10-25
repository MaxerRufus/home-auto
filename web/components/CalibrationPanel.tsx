'use client';

import React, { useState } from 'react';
import { Compass, CheckCircle2, Play, RotateCcw, AlertTriangle, ArrowRightLeft } from 'lucide-react';
import { DeviceCalibration } from '@/lib/types';

interface CalibrationPanelProps {
  calibration: DeviceCalibration;
  onStartStep: (stepNumber: number, param?: number) => void;
  onCancelCalibration: () => void;
  onToggleDirectionFlip: () => void;
}

interface StepInfo {
  number: number;
  title: string;
  duration: string;
  instruction: string;
  valueKey?: keyof DeviceCalibration;
  unit?: string;
}

export default function CalibrationPanel({
  calibration,
  onStartStep,
  onCancelCalibration,
  onToggleDirectionFlip,
}: CalibrationPanelProps) {
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [userHeightInput, setUserHeightInput] = useState('175');

  const steps: StepInfo[] = [
    {
      number: 1,
      title: 'Dark Baseline',
      duration: '15s',
      instruction: 'Close all curtains and turn off all lights in the room.',
      valueKey: 'dark_baseline',
      unit: 'ADC',
    },
    {
      number: 2,
      title: 'Daylight Baseline',
      duration: '15s',
      instruction: 'Open all curtains with artificial lights remaining OFF.',
      valueKey: 'daylight_baseline',
      unit: 'ADC',
    },
    {
      number: 3,
      title: 'Light A Contribution',
      duration: '10s',
      instruction: 'Measuring brightness contribution of Light A alone.',
      valueKey: 'light_a_contrib',
      unit: 'Δ ADC',
    },
    {
      number: 4,
      title: 'Light B Contribution',
      duration: '10s',
      instruction: 'Measuring brightness contribution of Light B alone.',
      valueKey: 'light_b_contrib',
      unit: 'Δ ADC',
    },
    {
      number: 5,
      title: 'Both Lights Contribution',
      duration: '10s',
      instruction: 'Measuring combined brightness contribution of both lights.',
      valueKey: 'both_contrib',
      unit: 'Δ ADC',
    },
    {
      number: 6,
      title: 'MPU6050 Rest Baseline & Knocks',
      duration: 'Rest + 2 Knocks',
      instruction: 'Keep device still for 3s, then give two deliberate knocks on the wall/enclosure.',
      valueKey: 'knock_threshold',
      unit: 'm/s²',
    },
    {
      number: 7,
      title: 'Doorway Floor Distance',
      duration: '3s',
      instruction: 'Ensure doorway is completely clear for downward ultrasonic baseline.',
      valueKey: 'floor_dist_a',
      unit: 'cm',
    },
    {
      number: 8,
      title: 'Standing Height & Offset',
      duration: '5s',
      instruction: 'Stand directly under the ultrasonic sensor to calibrate your known height.',
      valueKey: 'height_offset',
      unit: 'cm offset',
    },
  ];

  const handleRunStep = (stepNumber: number) => {
    setActiveStep(stepNumber);
    setProgress(0);

    const param = stepNumber === 8 ? Number(userHeightInput) : 0;
    onStartStep(stepNumber, param);

    // Simulated progress countdown for interactive browser experience
    let current = 0;
    const interval = setInterval(() => {
      current += 10;
      setProgress(current);
      if (current >= 100) {
        clearInterval(interval);
        setActiveStep(null);
      }
    }, 1000);
  };

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div className="tile-icon" style={{ color: 'var(--accent-cyan)' }}>
            <Compass size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Guided Hardware Calibration</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Step-by-step calibration stored in device EEPROM & Supabase database
            </p>
          </div>
        </div>

        <button
          onClick={onToggleDirectionFlip}
          className="btn btn-secondary"
          style={{ fontSize: '0.8rem' }}
          title="Invert doorway passage detection order"
        >
          <ArrowRightLeft size={14} />
          {calibration.direction_flipped ? 'Direction: Inverted' : 'Direction: Normal (A→B Entry)'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {steps.map((s) => {
          const isCurrent = activeStep === s.number;
          const currentVal = s.valueKey ? calibration[s.valueKey] : undefined;

          return (
            <div
              key={s.number}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1.15rem',
                borderRadius: 'var(--radius-sm)',
                background: isCurrent ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-secondary)',
                border: isCurrent ? '1px solid var(--accent-blue)' : '1px solid var(--border-color)',
                transition: 'var(--transition)',
              }}
            >
              <div style={{ flex: 1, paddingRight: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    Step {s.number}: {s.title}
                  </span>
                  <span className="badge badge-active" style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem' }}>
                    {s.duration}
                  </span>
                </div>
                <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                  {s.instruction}
                </p>

                {s.number === 8 && (
                  <div style={{ marginTop: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Your known height:</span>
                    <input
                      type="number"
                      value={userHeightInput}
                      onChange={(e) => setUserHeightInput(e.target.value)}
                      style={{ width: '80px', padding: '0.35rem 0.65rem', fontSize: '0.85rem' }}
                    />
                    <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>cm</span>
                  </div>
                )}

                {isCurrent && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ height: '4px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${progress}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-cyan))',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {currentVal !== undefined && (
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                      {typeof currentVal === 'number' ? currentVal.toFixed(1) : String(currentVal)}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
                      {s.unit}
                    </span>
                  </div>
                )}

                <button
                  onClick={() => handleRunStep(s.number)}
                  disabled={activeStep !== null}
                  className={`btn ${isCurrent ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
                >
                  {isCurrent ? 'Calibrating...' : <><Play size={12} /> Start</>}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
