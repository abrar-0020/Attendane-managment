import { storage } from './storage';

let CookieManager: any = null;
try {
  const mod = require('@react-native-cookies/cookies');
  CookieManager = mod.default || mod;
  // CookieManager loaded
} catch (e) {
  console.warn('[LinwaysSync] CookieManager native module not available, will use XHR fallback:', e);
}


let _sessionToken: string | null = null;

const LINWAYS_BASE = 'https://presidencyuniversity.linways.com';
const LOGIN_URL = `${LINWAYS_BASE}/academics/api/v1/auth/student-login-credentials`;
const TIMETABLE_URL = `${LINWAYS_BASE}/academics/api/v1/timetable`;
const DAILY_ATTENDANCE_URL = `${LINWAYS_BASE}/academics/api/v1/attendance/daily-attendance/`;
const PROFILE_URL = `${LINWAYS_BASE}/ams/student/home`;

const STATUS_MAP: Record<string, string> = {
  'Present': 'present',
  'Absent': 'absent',
  'present': 'present',
  'absent': 'absent',
  'P': 'present',
  'A': 'absent',
  'OD': 'present',
  'Od': 'present',
  'ML': 'absent',
  'CL': 'absent',
  'Leave': 'absent',
};

export const linwaysSync = {
  async isConfigured() {
    const cfg = await storage.getLinwaysConfig();
    return !!(cfg && cfg.username && cfg.password);
  },

  async saveConfig(config: any) {
    _sessionToken = null;
    await storage.saveLinwaysConfig(config);
  },

  async getConfig() {
    return await storage.getLinwaysConfig();
  },

  async clearConfig() {
    _sessionToken = null;
    await storage.saveLinwaysConfig(null);
  },

  async sync() {
    const cfg = await storage.getLinwaysConfig();
    if (!cfg || !cfg.username || !cfg.password) {
      return { success: false, error: 'Not configured. Please set up Linways sync in Settings.' };
    }

    try {
      if (!_sessionToken) {
        const loginResult = await _login(cfg.username, cfg.password);
        if (!loginResult.ok) {
          return { success: false, error: loginResult.error };
        }
        _sessionToken = loginResult.token;
        if (loginResult.studentId) {
          cfg.studentId = loginResult.studentId;
        }
        if (loginResult.profile?.name) {
          await storage.saveProfile({ name: loginResult.profile.name });
        }
      }



      const fromDate = await storage.getStartDate();
      const toDate = _formatDate(new Date());

      // 1. Fetch and map Timetable (Schedule only)
      let ttResult = await _fetchTimetable(cfg.studentId, _sessionToken, fromDate, toDate);
      if (!ttResult.ok && ttResult.expired) {
        _sessionToken = null;
        const loginRetry = await _login(cfg.username, cfg.password);
        if (!loginRetry.ok) return { success: false, error: loginRetry.error };
        _sessionToken = loginRetry.token;
        ttResult = await _fetchTimetable(cfg.studentId, _sessionToken, fromDate, toDate);
      }
      if (ttResult.ok && ttResult.data) {
        await _mapAndSaveTimetable(ttResult.data);
      }

      // 2. Fetch and map Daily Attendance (The source of truth for actual marked records)
      let attResult = await _fetchDailyAttendance(cfg.studentId, _sessionToken, fromDate, toDate);
      if (!attResult.ok && attResult.expired) {
        _sessionToken = null;
        const loginRetry = await _login(cfg.username, cfg.password);
        if (!loginRetry.ok) return { success: false, error: loginRetry.error };
        _sessionToken = loginRetry.token;
        attResult = await _fetchDailyAttendance(cfg.studentId, _sessionToken, fromDate, toDate);
      }

      let imported = 0;
      if (attResult.ok && attResult.data) {
        imported = await _mapAndSaveDailyAttendance(attResult.data);
      } else if (!attResult.ok) {
        return { success: false, error: attResult.error };
      }

      const updatedCfg = { ...cfg, lastSyncedAt: new Date().toISOString() };
      await storage.saveLinwaysConfig(updatedCfg);

      return { success: true, imported };
    } catch (err: any) {
      console.error('[LinwaysSync] Unexpected error:', err);
      return { success: false, error: 'Unexpected error: ' + err.message };
    }
  },

  async getLastSyncedLabel() {
    const cfg = await storage.getLinwaysConfig();
    if (!cfg || !cfg.lastSyncedAt) return null;
    const diff = Math.floor((Date.now() - new Date(cfg.lastSyncedAt).getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff} min ago`;
    const hrs = Math.floor(diff / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    return `${Math.floor(hrs / 24)} day(s) ago`;
  },
};

async function _loginWithXHR(username: string, password: string): Promise<{ status: number; responseText: string; cookieHeader: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', LOGIN_URL, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Origin', 'https://presidencyuniversity.linways.com');
    xhr.setRequestHeader('Referer', 'https://presidencyuniversity.linways.com/ams/student/login');
    xhr.setRequestHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
    xhr.setRequestHeader('x-menu-code', 'STUDENT_LOGIN');
    xhr.withCredentials = true;
    xhr.onload = () => {
      const allHeaders = xhr.getAllResponseHeaders();
      // headers captured (not logged in production)
      resolve({
        status: xhr.status,
        responseText: xhr.responseText,
        cookieHeader: allHeaders,
      });
    };
    xhr.onerror = () => reject(new Error('XHR network error'));
    xhr.send(JSON.stringify({ username, password, next: '', userType: 'STUDENT' }));
  });
}

function _extractCookiesFromXHRHeaders(allHeaders: string): string {
  const lines = allHeaders.split('\r\n');
  const extractedCookies: string[] = [];
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith('set-cookie:')) {
      const cookieVal = line.substring('set-cookie:'.length).trim().split(';')[0].trim();
      if (cookieVal) {
        extractedCookies.push(cookieVal);
      }
    }
  }
  // cookies extracted (not logged in production)
  return extractedCookies.join('; ');
}

async function _login(username: string, password: string): Promise<any> {
  try {

    // establish session
    try {
      // Clear cookies first if native module exists
      if (CookieManager) {
        await CookieManager.clearAll();
      }
      await fetch(LOGIN_URL, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
        },
      });
    } catch(e) {}

    // logging in using pure fetch
    let status = 0;
    let responseData: any = null;
    try {
      const res = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://presidencyuniversity.linways.com',
          'Referer': 'https://presidencyuniversity.linways.com/ams/student/login',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
          'x-menu-code': 'STUDENT_LOGIN'
        },
        credentials: 'include',
        body: JSON.stringify({ username, password, next: '', userType: 'STUDENT' })
      });
      status = res.status;
      
      const text = await res.text();
      
      try {
        responseData = JSON.parse(text);
      } catch(e) {}
    } catch (err) {
      console.warn('[LinwaysSync] fetch login failed:', err);
    }

    console.log('[LinwaysSync] _login response: ' + status);
    if (status === 401 || status === 403) {
      return { ok: false, error: 'Invalid username or password. Please check your credentials.' };
    }
    if (status < 200 || status >= 300) {
      return { ok: false, error: `Login failed (HTTP ${status}). Please try again.` };
    }

    let token = '';

    // Strategy 1: Token in JSON response body (JWT)
    if (responseData) {
      if (responseData.token) token = responseData.token;
      else if (responseData.accessToken) token = responseData.accessToken;
      else if (responseData.data && responseData.data.token) token = responseData.data.token;
      else if (responseData.data && responseData.data.accessToken) token = responseData.data.accessToken;
    }

    // Fallback: assume native OkHttp handles cookies if token is missing
    if (!token) {
      token = 'native_handled';
    }

    // Strategy 1: Use native CookieManager (most reliable)
    if (CookieManager) {
      try {
        const cookies = await CookieManager.get('https://presidencyuniversity.linways.com') || {};
        const cookiesBase = await CookieManager.get('https://linways.com') || {};
        const allCookies = { ...cookiesBase, ...cookies };
        // cookies retrieved
        if (allCookies['AUTH_SESSION']) {
          token = allCookies['AUTH_SESSION'].value;
        } else if (Object.keys(allCookies).length > 0) {
          token = Object.keys(allCookies).map(k => `${k}=${allCookies[k].value}`).join('; ');
        }
      } catch (e) {
        console.warn('[LinwaysSync] CookieManager extraction failed:', e);
      }
    }

    // Strategy 2: (Removed because XHR is no longer used)

    // Strategy 3: Token in JSON response body
    if (!token && responseData) {
      if (responseData.token) token = responseData.token;
      else if (responseData.data && responseData.data.token) token = responseData.data.token;
    }

    // token extracted

    let studentId = '';
    let profileData = null;

    // --- Strategy A: Extract name from login responseData body ---
    // parse name from response
    if (responseData) {
      const d = responseData?.data || responseData;
      const nameFromResponse =
        d?.name || d?.fullName || d?.studentName || d?.displayName ||
        d?.user?.name || d?.student?.name || responseData?.name || '';
      if (nameFromResponse) {
        profileData = { name: nameFromResponse };
        // name found in response body
        await storage.saveProfile({ name: nameFromResponse });
      }
      const idFromResponse = d?.userId || d?.studentId || d?.id;
      if (idFromResponse) studentId = String(idFromResponse);
    }

    // --- Strategy B: Decode JWT and extract name if not yet found ---
    if (!profileData && token && token.startsWith('ey')) {
      try {
        const parts = token.split('.');
        if (parts.length > 1) {
          let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          while (base64.length % 4) base64 += '=';
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
          let output = '';
          for (let bc = 0, bs = 0, buffer: any, i = 0; buffer = base64.charAt(i++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
            buffer = chars.indexOf(buffer);
          }
          const jsonPayload = decodeURIComponent(
            output.split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
          );
          const parsed = JSON.parse(jsonPayload);
          // JWT decoded
          const d = parsed?.data || parsed;
          const candidateName =
            d?.name || d?.fullName || d?.studentName || d?.displayName ||
            d?.userName || d?.user?.name || parsed?.name || parsed?.fullName || '';
          if (!studentId) {
            const jwtId = d?.userId || d?.studentId || parsed?.userId;
            if (jwtId) studentId = String(jwtId);
          }
          if (candidateName) {
            profileData = { name: candidateName };
            // name found in JWT
            await storage.saveProfile({ name: candidateName });
          }
        }
      } catch (e) {
        console.warn('[LinwaysSync] JWT decode failed:', e);
      }
    }

    if (!profileData) {
      console.warn('[LinwaysSync] ⚠️ Could not extract student name. Will show "Student".');
    }

    return { ok: true, token, studentId, profile: profileData, responseData, jwtData: profileData };

  } catch (err) {
    return { ok: false, error: 'Cannot reach the university portal. Check your internet connection.' };
  }
}



async function _fetchTimetable(studentId: string, token: string | null, fromDate: string, toDate: string): Promise<any> {
  try {
    const url = `${TIMETABLE_URL}?studentId=${studentId}&getStudentAbsentStatus=true&fetchOnlyCurrentBatchDetails=true&getDaywise=true&fromDate=${fromDate}&toDate=${toDate}&includeIsOpenToAll=true&checkAttendanceMarkedDetails=true&requiredOtherStaffHour=false`;
    const headers: any = { 
      'Content-Type': 'application/json',
      'Origin': 'https://presidencyuniversity.linways.com',
      'Referer': 'https://presidencyuniversity.linways.com/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    };
    
    if (token && token.startsWith('ey')) {
      headers['Authorization'] = `Bearer ${token}`;
    } else if (token && token !== 'native_handled') {
      headers['Cookie'] = token;
    }

    // fetching timetable
    const res = await fetch(url, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    console.log('[LinwaysSync] _fetchTimetable response: ' + res.status);
    if (res.status === 401 || res.status === 403) {
      return { ok: false, expired: true, error: 'Session expired.' };
    }
    if (!res.ok) {
      return { ok: false, error: `Timetable fetch failed (HTTP ${res.status}).` };
    }

    const json = await res.json();
    return { ok: true, data: json };
  } catch (err) {
    return { ok: false, error: 'Cannot reach the university portal. Check your internet connection.' };
  }
}

async function _mapAndSaveTimetable(payload: any) {
  if (!payload || !payload.data || !Array.isArray(payload.data)) {
    return;
  }

  // Check if timetable response contains student name
  const studentNameFromTT = payload.studentName || payload.name || payload.student_name || payload.data?.[0]?.studentName || '';
  if (studentNameFromTT) {
    // student name from timetable payload
    await storage.saveProfile({ name: studentNameFromTT });
  }

  const newTimetableEntries: any[] = [];
  const dateClassMap: Record<string, any[]> = {};
  let earliestDate: string | null = null;

  for (const day of payload.data) {
    const dateRaw = day.date;
    const date = _normaliseDate(dateRaw);
    if (!date) continue;

    if (!earliestDate || date < earliestDate) {
      earliestDate = date;
    }

    const d = new Date(date);
    const validDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekday = validDays[d.getDay()];

    if (!dateClassMap[date]) {
      dateClassMap[date] = [];
    }

    if (!day.hours || !Array.isArray(day.hours)) continue;

    for (const hourObj of day.hours) {
      const timeTable = hourObj.timeTables?.[0];
      if (!timeTable) continue;

      const hour = parseInt(hourObj.hour || timeTable.hour || '1', 10);
      let subjectName = timeTable.subjects?.[0]?.name;
      if (!subjectName) {
        subjectName = timeTable.subjects?.[0]?.code || timeTable.clusterName || 'Unknown Subject';
      }

      const starttime = timeTable.fromTime ? timeTable.fromTime.substring(0, 5) : '';
      const endtime = timeTable.toTime ? timeTable.toTime.substring(0, 5) : '';
      const room = timeTable.classroomCode || '';

      const classEntry = {
        day: weekday,
        hour,
        starttime,
        endtime,
        subject: subjectName,
        room
      };

      dateClassMap[date].push(classEntry);

      const exists = newTimetableEntries.find(t => 
        t.day === weekday && t.hour === hour && t.subject === subjectName
      );
      if (!exists) {
        newTimetableEntries.push(classEntry);
      }
    }
  }

  if (Object.keys(dateClassMap).length > 0) {
    await storage.importExactTimetableData(dateClassMap);
  }

  if (newTimetableEntries.length > 0) {
    await storage.importTimetableData(newTimetableEntries);
  }

  if (earliestDate) {
    const rawStartDate = await storage.getStartDate();
    if (earliestDate < rawStartDate) {
      await storage.saveStartDate(earliestDate);
    }
  }
}

async function _fetchDailyAttendance(studentId: string, token: string | null, fromDate: string, toDate: string): Promise<any> {
  try {
    const params = JSON.stringify({
      toDate,
      fromDate,
      emitAsResetWhileReset: true,
      studentId: String(studentId),
    });

    const url = `${DAILY_ATTENDANCE_URL}?params=${encodeURIComponent(params)}`;
    const headers: any = { 
      'Content-Type': 'application/json',
      'Origin': 'https://presidencyuniversity.linways.com',
      'Referer': 'https://presidencyuniversity.linways.com/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    };
    
    if (token && token.startsWith('ey')) {
      headers['Authorization'] = `Bearer ${token}`;
    } else if (token && token !== 'native_handled') {
      headers['Cookie'] = token;
    }

    // fetching daily attendance
    const res = await fetch(url, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    console.log('[LinwaysSync] _fetchDailyAttendance response: ' + res.status);
    if (res.status === 401 || res.status === 403) {
      return { ok: false, expired: true, error: 'Session expired.' };
    }
    if (!res.ok) {
      return { ok: false, error: `Daily attendance fetch failed (HTTP ${res.status}).` };
    }

    const json = await res.json();
    return { ok: true, data: json };
  } catch (err) {
    return { ok: false, error: 'Cannot reach the university portal. Check your internet connection.' };
  }
}

async function _mapAndSaveDailyAttendance(payload: any): Promise<number> {
  let entries: any[] = [];
  if (payload && payload.data && Array.isArray(payload.data.report)) {
    entries = payload.data.report;
  } else if (payload && Array.isArray(payload.report)) {
    entries = payload.report;
  } else if (Array.isArray(payload)) {
    entries = payload; // fallback
  }

  console.log(`[LinwaysSync] Parsing ${entries.length} daily attendance days`);
  const timetable = await storage.getTimetable();
  
  // Clean up existing records for the dates we are syncing
  // This removes any old corrupted records (e.g. from the previous hour-override bug)
  const datesToClear = new Set<string>();
  for (const day of entries) {
    const rawDate = day.attendance_date || day.date;
    if (!rawDate) continue;
    let formattedDate = _normaliseDate(rawDate);
    if (!formattedDate) {
      const parts = rawDate.split("-");
      if (parts.length === 3) formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    if (formattedDate) datesToClear.add(formattedDate);
  }

  const existingRecords = await storage.getRecords();
  const cleanedRecords = existingRecords.filter((r: any) => !datesToClear.has(r.date));
  await storage.saveRecords(cleanedRecords);

  let count = 0;

  for (const day of entries) {
    const rawDate = day.attendance_date || day.date;
    if (!rawDate) continue;

    let formattedDate = _normaliseDate(rawDate);
    if (!formattedDate) {
      // Manual fallback for DD-MM-YYYY
      const parts = rawDate.split("-");
      if (parts.length === 3) {
        formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      } else {
        continue;
      }
    }

    if (day.hourDetails && Array.isArray(day.hourDetails)) {
      for (const hourDetail of day.hourDetails) {
        const hourStr = hourDetail.markedHour || hourDetail.hour;
        if (!hourStr) continue;
        const hour = parseInt(hourStr, 10);

        if (hourDetail.subjectDetails && Array.isArray(hourDetail.subjectDetails)) {
          for (const subj of hourDetail.subjectDetails) {
            if (!subj.subjectName && !subj.subjectCode) continue;

            let cleanSubject = subj.subjectName || subj.subjectCode || '';
            if (cleanSubject.includes('(')) {
              cleanSubject = cleanSubject.split('(')[0].trim();
            }

            let status = "unmarked";
            if (String(subj.attendanceStatus) === "1") {
              status = "absent";
            } else if (String(subj.attendanceStatus) === "0") {
              status = "present";
            }

            if (subj.dutyLeave === "1" || subj.grantLeave === "1") {
              status = "present";
            }

            // Sometimes it comes in as text "Present" or "Absent" in weird edge cases
            if (status === "unmarked" && subj.status) {
              const mapped = STATUS_MAP[String(subj.status).trim()];
              if (mapped) status = mapped;
            }

            if (status !== "unmarked") {
              // Find matching subject name from timetable, but ALWAYS use the actual hour from the attendance record!
              const ttEntry = timetable.find(
                (t: any) => t.subject === cleanSubject || t.subject?.toLowerCase() === cleanSubject.toLowerCase()
              ) || timetable.find(
                (t: any) => cleanSubject.toLowerCase().includes(t.subject?.toLowerCase()) || t.subject?.toLowerCase().includes(cleanSubject.toLowerCase())
              );

              const resolvedSubject = ttEntry ? ttEntry.subject : cleanSubject;
              const resolvedHour = hour;

              await storage.addRecord({
                date: formattedDate,
                subject: resolvedSubject,
                hour: resolvedHour,
                status: status
              });
              count++;
            }
          }
        }
      }
    }
  }

  return count;
}

function _normaliseDate(raw: string) {
  if (!raw) return null;
  const s = String(raw).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const dmy = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;

  const d = new Date(s);
  if (!isNaN(d.getTime())) return _formatDate(d);

  return null;
}

function _formatDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
