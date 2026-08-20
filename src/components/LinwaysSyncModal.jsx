import { useState, useEffect } from 'react';
import { linwaysSync } from '../services/linwaysSync';
import { storage } from '../services/storage';
import './LinwaysSyncModal.css';

export default function LinwaysSyncModal({ onClose, onSyncComplete }) {
  const [step, setStep] = useState('form'); // 'form' | 'syncing' | 'success' | 'error'

  // Form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [studentId, setStudentId] = useState('');
  const [autoSync, setAutoSync] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Result state
  const [errorMsg, setErrorMsg] = useState('');
  const [importedCount, setImportedCount] = useState(0);
  const [lastSynced, setLastSynced] = useState('');

  // Load saved config on mount
  useEffect(() => {
    const cfg = linwaysSync.getConfig();
    if (cfg) {
      setUsername(cfg.username || '');
      setPassword(cfg.password || '');
      setStudentId(cfg.studentId || '');
      setAutoSync(cfg.autoSync !== false);
    }
    const label = linwaysSync.getLastSyncedLabel();
    if (label) setLastSynced(label);
  }, []);

  const handleSave = async () => {
    if (!username.trim() || !password.trim() || !studentId.trim()) {
      setErrorMsg('Please fill in all three fields.');
      return;
    }
    setErrorMsg('');

    const config = {
      username: username.trim(),
      password: password.trim(),
      studentId: studentId.trim(),
      autoSync,
      fromDate: storage.getStartDate(),
    };

    linwaysSync.saveConfig(config);
    await runSync();
  };

  const runSync = async () => {
    setStep('syncing');
    const result = await linwaysSync.sync();

    if (result.success) {
      setImportedCount(result.imported);
      setLastSynced('Just now');
      setStep('success');
      if (onSyncComplete) onSyncComplete();
    } else {
      setErrorMsg(result.error || 'Unknown error.');
      setStep('error');
    }
  };

  const handleRetry = () => {
    setStep('form');
    setErrorMsg('');
  };

  const handleDisconnect = () => {
    if (window.confirm('Remove Linways sync credentials from this device?')) {
      linwaysSync.clearConfig();
      onClose();
    }
  };

  return (
    <div className="lws-overlay">
      <div className="lws-container">

        {/* ── Header ──────────────────────────────────────────── */}
        <header className="lws-header">
          <button className="lws-back-btn" onClick={onClose} aria-label="Go back">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="lws-header-title">Linways Sync</h2>
          <div style={{ width: 40 }} />
        </header>

        <main className="lws-main">

          {/* ── FORM step ───────────────────────────────────────── */}
          {(step === 'form' || step === 'error') && (
            <>
              <div className="lws-icon-wrap">
                <span className="material-symbols-outlined lws-hero-icon">sync_lock</span>
              </div>
              <h1 className="lws-title">Auto-Sync Attendance</h1>
              <p className="lws-subtitle">
                Enter your Presidency University portal credentials. AttendMe will fetch
                your daily attendance automatically every time the app opens.
              </p>

              {lastSynced && (
                <div className="lws-last-synced">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>schedule</span>
                  Last synced: {lastSynced}
                </div>
              )}

              <div className="lws-form">
                {/* Username */}
                <div className="lws-field">
                  <label className="lws-label" htmlFor="lws-username">
                    University Username
                  </label>
                  <input
                    id="lws-username"
                    className="lws-input"
                    type="text"
                    autoComplete="username"
                    placeholder="e.g. 20789"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                  />
                </div>

                {/* Password */}
                <div className="lws-field">
                  <label className="lws-label" htmlFor="lws-password">
                    Portal Password
                  </label>
                  <div className="lws-input-row">
                    <input
                      id="lws-password"
                      className="lws-input"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Your Linways password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="lws-eye-btn"
                      onClick={() => setShowPassword(v => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <span className="material-symbols-outlined">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Student ID */}
                <div className="lws-field">
                  <label className="lws-label" htmlFor="lws-studentid">
                    Student ID (for API)
                  </label>
                  <input
                    id="lws-studentid"
                    className="lws-input"
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 20789"
                    value={studentId}
                    onChange={e => setStudentId(e.target.value)}
                  />
                  <span className="lws-hint">
                    This is the numeric ID used in the attendance API (often same as username).
                  </span>
                </div>

                {/* Auto-sync toggle */}
                <div className="lws-toggle-row">
                  <div className="lws-toggle-left">
                    <span className="material-symbols-outlined lws-toggle-icon">autorenew</span>
                    <div>
                      <span className="lws-toggle-title">Auto-sync on app open</span>
                      <span className="lws-toggle-sub">Fetches latest attendance silently</span>
                    </div>
                  </div>
                  <label className="lws-toggle">
                    <input
                      type="checkbox"
                      checked={autoSync}
                      onChange={e => setAutoSync(e.target.checked)}
                    />
                    <span className="lws-toggle-track" />
                  </label>
                </div>

                {/* Security note */}
                <div className="lws-security-note">
                  <span className="material-symbols-outlined" style={{ fontSize: 16, flexShrink: 0 }}>
                    lock
                  </span>
                  <span>
                    Credentials are stored only on this device. All requests go directly
                    to the official Linways portal — no third-party servers involved.
                  </span>
                </div>

                {/* Error */}
                {step === 'error' && errorMsg && (
                  <div className="lws-error-msg">
                    <span className="material-symbols-outlined" style={{ fontSize: 18, flexShrink: 0 }}>
                      error
                    </span>
                    {errorMsg}
                  </div>
                )}

                <button className="lws-primary-btn" onClick={handleSave}>
                  Save &amp; Sync Now
                </button>

                {linwaysSync.isConfigured() && (
                  <button className="lws-danger-btn" onClick={handleDisconnect}>
                    Remove Saved Credentials
                  </button>
                )}
              </div>
            </>
          )}

          {/* ── SYNCING step ─────────────────────────────────────── */}
          {step === 'syncing' && (
            <div className="lws-center">
              <div className="lws-spinner" aria-label="Syncing" />
              <p className="lws-syncing-title">Syncing from Linways…</p>
              <p className="lws-syncing-sub">
                Logging in and fetching your attendance records. This takes just a moment.
              </p>
            </div>
          )}

          {/* ── SUCCESS step ─────────────────────────────────────── */}
          {step === 'success' && (
            <div className="lws-center">
              <div className="lws-success-icon-wrap">
                <span className="material-symbols-outlined lws-success-icon">check_circle</span>
              </div>
              <p className="lws-success-title">Sync complete!</p>
              <p className="lws-success-sub">
                {importedCount > 0
                  ? `${importedCount} attendance records were imported and your stats are now up to date.`
                  : 'Your attendance is already up to date. No new records were found.'}
              </p>
              <button className="lws-primary-btn" style={{ marginTop: 24 }} onClick={onClose}>
                Done
              </button>
              <button
                className="lws-text-btn"
                onClick={handleRetry}
              >
                Edit credentials
              </button>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
