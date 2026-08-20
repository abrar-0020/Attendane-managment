/**
 * linwaysSync.js
 *
 * Handles all communication with the Presidency University Linways portal.
 *
 * SECURITY NOTES:
 * - Credentials (username/password) are stored in localStorage ONLY because the user
 *   explicitly opted in to auto-sync. They are never logged or sent to any third-party server.
 * - The JWT / session token obtained after login is held ONLY in module-level memory
 *   (the `_sessionToken` variable below). It is NEVER written to localStorage or disk.
 *   Closing the tab wipes the token completely.
 * - All network requests go directly from the user's device to presidencyuniversity.linways.com.
 *   During local development the Vite proxy is used to bypass CORS. In production the app
 *   must be hosted on the same origin or a CORS-allowed origin; otherwise the user needs to
 *   use the browser's native fetch (see proxy note in vite.config.js).
 */

import { storage } from './storage.js';

// ─── Module-level in-memory session token (never stored to disk) ───────────
let _sessionToken = null;

// ─── Constants ──────────────────────────────────────────────────────────────
const LINWAYS_BASE = '/linways-api'; // proxied in dev; same-origin in prod build
const LOGIN_URL = `${LINWAYS_BASE}/ams/student/login`;
const ATTENDANCE_URL = `${LINWAYS_BASE}/academics/api/v1/attendance/daily-attendance/`;

// Linways status strings → AttendMe status
const STATUS_MAP = {
  'Present': 'present',
  'Absent': 'absent',
  'present': 'present',
  'absent': 'absent',
  'P': 'present',
  'A': 'absent',
  'OD': 'present',   // On Duty counts as present for attendance purposes
  'Od': 'present',
  'ML': 'absent',    // Medical Leave — mark absent so it is counted
  'CL': 'absent',
  'Leave': 'absent',
};

// ─── Public API ─────────────────────────────────────────────────────────────

export const linwaysSync = {
  /**
   * Returns true if Linways auto-sync is configured (credentials saved).
   */
  isConfigured() {
    const cfg = storage.getLinwaysConfig();
    return !!(cfg && cfg.username && cfg.password);
  },

  /**
   * Save credentials and settings. Password is stored in localStorage because
   * the user explicitly opted in to auto-sync (just like any "remember me" flow).
   */
  saveConfig(config) {
    storage.saveLinwaysConfig(config);
  },

  getConfig() {
    return storage.getLinwaysConfig();
  },

  clearConfig() {
    _sessionToken = null;
    storage.saveLinwaysConfig(null);
  },

  /**
   * Full auto-sync cycle: login → fetch → map → save.
   * Returns a result object { success, imported, error }.
   */
  async sync() {
    const cfg = storage.getLinwaysConfig();
    if (!cfg || !cfg.username || !cfg.password) {
      return { success: false, error: 'Not configured. Please set up Linways sync in Settings.' };
    }

    try {
      // 1. Obtain session token (reuse if already in memory)
      if (!_sessionToken) {
        const loginResult = await _login(cfg.username, cfg.password);
        if (!loginResult.ok) {
          return { success: false, error: loginResult.error };
        }
        _sessionToken = loginResult.token;
      }

      // 2. Determine date range: semester start → today
      const fromDate = cfg.fromDate || storage.getStartDate();
      const toDate = _formatDate(new Date());

      // 3. Fetch daily attendance
      const fetchResult = await _fetchAttendance(cfg.studentId, _sessionToken, fromDate, toDate);
      if (!fetchResult.ok) {
        // Token may have expired — clear and retry once
        if (fetchResult.expired) {
          _sessionToken = null;
          const loginRetry = await _login(cfg.username, cfg.password);
          if (!loginRetry.ok) {
            return { success: false, error: loginRetry.error };
          }
          _sessionToken = loginRetry.token;
          const retryFetch = await _fetchAttendance(cfg.studentId, _sessionToken, fromDate, toDate);
          if (!retryFetch.ok) {
            return { success: false, error: retryFetch.error };
          }
          fetchResult.data = retryFetch.data;
          fetchResult.ok = true;
        } else {
          return { success: false, error: fetchResult.error };
        }
      }

      // 4. Map and save records
      const imported = _mapAndSave(fetchResult.data);

      // 5. Update last synced timestamp
      const updatedCfg = { ...cfg, lastSyncedAt: new Date().toISOString() };
      storage.saveLinwaysConfig(updatedCfg);

      return { success: true, imported };
    } catch (err) {
      console.error('[LinwaysSync] Unexpected error:', err);
      return { success: false, error: 'Unexpected error: ' + err.message };
    }
  },

  /** Returns a human-readable "Last synced X minutes ago" string, or null. */
  getLastSyncedLabel() {
    const cfg = storage.getLinwaysConfig();
    if (!cfg || !cfg.lastSyncedAt) return null;
    const diff = Math.floor((Date.now() - new Date(cfg.lastSyncedAt).getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff} min ago`;
    const hrs = Math.floor(diff / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    return `${Math.floor(hrs / 24)} day(s) ago`;
  },
};

// ─── Private helpers ─────────────────────────────────────────────────────────

/**
 * Authenticate with Linways and return { ok, token, error }.
 * We POST to the login URL and extract the auth token from the response.
 */
async function _login(username, password) {
  try {
    const res = await fetch(LOGIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      credentials: 'omit',
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return { ok: false, error: 'Invalid username or password. Please check your credentials.' };
      }
      return { ok: false, error: `Login failed (HTTP ${res.status}). Please try again.` };
    }

    const data = await res.json();

    // Linways may return token in different fields — try all common ones
    const token =
      data?.data?.token ||
      data?.token ||
      data?.data?.authToken ||
      data?.authToken ||
      data?.data?.jwt ||
      data?.jwt ||
      null;

    if (!token) {
      // Some Linways instances set a cookie-based session — try to proceed without a Bearer token
      // We'll pass an empty string and let _fetchAttendance use cookies if credentials: 'include'
      return { ok: true, token: '' };
    }

    return { ok: true, token };
  } catch (err) {
    return { ok: false, error: 'Cannot reach the university portal. Check your internet connection.' };
  }
}

/**
 * Fetch daily attendance for the given date range.
 * Returns { ok, data, expired, error }.
 */
async function _fetchAttendance(studentId, token, fromDate, toDate) {
  try {
    const params = JSON.stringify({
      toDate,
      fromDate,
      emitAsResetWhileReset: true,
      studentId: String(studentId),
    });

    const url = `${ATTENDANCE_URL}?params=${encodeURIComponent(params)}`;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, {
      method: 'GET',
      headers,
      credentials: token ? 'omit' : 'include', // use cookies if no Bearer token
    });

    if (res.status === 401 || res.status === 403) {
      return { ok: false, expired: true, error: 'Session expired.' };
    }
    if (!res.ok) {
      return { ok: false, error: `Attendance fetch failed (HTTP ${res.status}).` };
    }

    const json = await res.json();
    return { ok: true, data: json };
  } catch (err) {
    return { ok: false, error: 'Cannot reach the university portal. Check your internet connection.' };
  }
}

/**
 * Maps Linways daily attendance payload to AttendMe records and saves them.
 * Returns the count of records imported/updated.
 *
 * Linways response shape (observed):
 * {
 *   data: [
 *     {
 *       date: "2026-08-05",            // or "05-08-2026" or "05/08/2026"
 *       subjectCode: "CS101",
 *       subjectName: "Data Structures",
 *       hour: 1,                       // or "1"
 *       status: "Present",             // or "Absent", "OD", "P", "A" ...
 *       startTime: "09:00",            // optional
 *       endTime: "10:00",              // optional
 *     },
 *     ...
 *   ]
 * }
 *
 * We normalise variations defensively.
 */
function _mapAndSave(payload) {
  // Extract the array — handle both { data: [...] } and direct array
  let entries = [];
  if (Array.isArray(payload)) {
    entries = payload;
  } else if (Array.isArray(payload?.data)) {
    entries = payload.data;
  } else if (Array.isArray(payload?.attendance)) {
    entries = payload.attendance;
  } else {
    // Try to find any top-level array key
    for (const key of Object.keys(payload || {})) {
      if (Array.isArray(payload[key]) && payload[key].length > 0) {
        entries = payload[key];
        break;
      }
    }
  }

  const timetable = storage.getTimetable();
  let count = 0;

  for (const entry of entries) {
    // ── Normalise date ──────────────────────────────────────────────────────
    const dateRaw = entry.date || entry.attendanceDate || entry.Date || '';
    const date = _normaliseDate(dateRaw);
    if (!date) continue;

    // ── Normalise status ────────────────────────────────────────────────────
    const statusRaw = String(entry.status || entry.attendanceStatus || entry.Status || '').trim();
    const status = STATUS_MAP[statusRaw];
    if (!status) continue; // Skip unknown statuses (e.g. "Holiday", "")

    // ── Normalise subject ───────────────────────────────────────────────────
    const subjectCode = String(entry.subjectCode || entry.subject || entry.subCode || '').trim();
    const hour = parseInt(entry.hour || entry.periodNo || entry.period || 1, 10);

    if (!subjectCode) continue;

    // ── Match against local timetable ───────────────────────────────────────
    // Try exact code match first; fall back to partial match
    const ttEntry = timetable.find(
      t => t.subject === subjectCode || t.subject?.toLowerCase() === subjectCode.toLowerCase()
    ) || timetable.find(
      t => subjectCode.toLowerCase().includes(t.subject?.toLowerCase())
    );

    const resolvedSubject = ttEntry ? ttEntry.subject : subjectCode;
    const resolvedHour = ttEntry ? ttEntry.hour : hour;

    storage.addRecord({
      date,
      subject: resolvedSubject,
      hour: resolvedHour,
      status,
    });
    count++;
  }

  return count;
}

/** Normalise various Linways date formats to YYYY-MM-DD. */
function _normaliseDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // DD-MM-YYYY or DD/MM/YYYY
  const dmy = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;

  // Try native Date parse as last resort
  const d = new Date(s);
  if (!isNaN(d.getTime())) return _formatDate(d);

  return null;
}

function _formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
