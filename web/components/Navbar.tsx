'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cpu, Moon, Sun, Home, Shield, RefreshCw } from 'lucide-react';

interface NavbarProps {
  userEmail?: string | null;
  onSignOut?: () => void;
}

export default function Navbar({ userEmail, onSignOut }: NavbarProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  return (
    <nav className="navbar" role="navigation" aria-label="Main Navigation">
      <div className="container nav-content">
        <Link href="/" className="brand-logo" aria-label="Smart Home Hub Dashboard">
          <div className="brand-icon">
            <Cpu size={22} />
          </div>
          <span>Smart Home Hub</span>
        </Link>

        <div className="nav-actions">
          <Link href="/" className="btn btn-ghost" style={{ fontSize: '0.85rem' }}>
            <Home size={16} />
            <span>Devices</span>
          </Link>

          <button
            onClick={toggleTheme}
            className="btn btn-secondary btn-icon"
            aria-label="Toggle dark/light theme"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {userEmail ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {userEmail}
              </span>
              <button
                onClick={onSignOut}
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link href="/login" className="btn btn-primary" style={{ padding: '0.45rem 1rem' }}>
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
