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
let _sessionCookie: string | null = null;

function _decodeJwt(token: string): any {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let str = '';
    for (let i = 0; i < base64.length; i += 4) {
      const c1 = chars.indexOf(base64[i]);
      const c2 = chars.indexOf(base64[i + 1]);
      const c3 = base64[i + 2] === '=' ? -1 : chars.indexOf(base64[i + 2]);
      const c4 = base64[i + 3] === '=' ? -1 : chars.indexOf(base64[i + 3]);

      str += String.fromCharCode((c1 << 2) | (c2 >> 4));
      if (c3 !== -1) {
        str += String.fromCharCode(((c2 & 15) << 4) | (c3 >> 2));
      }
      if (c4 !== -1) {
        str += String.fromCharCode(((c3 & 3) << 6) | c4);
      }
    }

    // Properly decode UTF-8 from the binary string
    const jsonPayload = decodeURIComponent(
      str.split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.warn('[LinwaysSync] JWT decode error:', e);
    return null;
  }
}

const LINWAYS_BASE = 'https://presidencyuniversity.linways.com';
const LOGIN_URL = `${LINWAYS_BASE}/academics/api/v1/auth/student-login-credentials`;
const TIMETABLE_URL = `${LINWAYS_BASE}/academics/api/v1/timetable`;
const DAILY_ATTENDANCE_URL = `${LINWAYS_BASE}/academics/api/v1/attendance/daily-attendance/`;
const PROFILE_URL = `${LINWAYS_BASE}/ams/student/home`;

const fetchWithTimeout = (url: string, options: any, timeoutMs = 15000) => {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Network request timed out')), timeoutMs)
    )
  ]) as Promise<Response>;
};

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
      // Always login fresh — this is the ONLY reliable source of studentId for any account
      const loginResult = await _login(cfg.username, cfg.password);
      if (!loginResult.ok) {
        return { success: false, error: loginResult.error };
      }
      _sessionToken = loginResult.token;
      _sessionCookie = loginResult.cookieStr;

      // studentId from server / JWT
      const studentId = loginResult.studentId || '';

      // If student ID changed (different user logged in on same device), wipe stale data
      if (studentId && cfg.studentId && cfg.studentId !== studentId) {
        console.log('[LinwaysSync] Student ID changed. Clearing old data.');
        await storage.saveTimetable([]);
        await storage.saveExactTimetable({});
        await storage.saveRecords([]);
        await storage.saveBaseCounts({});
      }

      // Persist whatever we have (studentId may be empty — that is OK)
      await storage.saveLinwaysConfig({ ...cfg, studentId });

      if (loginResult.profile?.name) {
        await storage.saveProfile({ name: loginResult.profile.name });
      }

      const fromDate = cfg.fromDate || await storage.getStartDate();
      const toDate = _formatDate(new Date());

      // Step 1: Fetch Daily Attendance first
      let attResult = await _fetchDailyAttendance(studentId, _sessionToken, _sessionCookie, fromDate, toDate);
      if (!attResult.ok && attResult.expired) {
        const loginRetry = await _login(cfg.username, cfg.password);
        if (!loginRetry.ok) return { success: false, error: loginRetry.error };
        _sessionToken = loginRetry.token;
        _sessionCookie = loginRetry.cookieStr;
        attResult = await _fetchDailyAttendance(studentId, _sessionToken, _sessionCookie, fromDate, toDate);
      }
      if (!attResult.ok) {
        return { success: false, error: attResult.error };
      }

      // Step 2: If we still don't have a studentId, try to extract it from the attendance payload
      let resolvedStudentId = studentId;
      if (!resolvedStudentId && attResult.data) {
        const p = attResult.data;
        const extracted =
          p?.studentId || p?.data?.studentId ||
          p?.report?.[0]?.studentId || p?.data?.report?.[0]?.studentId ||
          p?.report?.[0]?.student_id || p?.data?.report?.[0]?.student_id ||
          p?.studentDetails?.id || p?.data?.studentDetails?.id ||
          p?.student?.id || p?.data?.student?.id;
        if (extracted) {
          resolvedStudentId = String(extracted);
          console.log('[LinwaysSync] Extracted studentId from attendance payload:', resolvedStudentId);
          await storage.saveLinwaysConfig({ ...cfg, studentId: resolvedStudentId });

          // Also try to get name from attendance payload
          const nameFromAtt =
            p?.studentName || p?.data?.studentName ||
            p?.studentDetails?.name || p?.data?.studentDetails?.name ||
            p?.student?.name || p?.data?.student?.name;
          if (nameFromAtt && !(loginResult as any).profile?.name) {
            await storage.saveProfile({ name: nameFromAtt });
          }
        }
      }

      // Step 3: Fetch Timetable — with studentId, bearer token, and cookies
      let ttResult = await _fetchTimetable(resolvedStudentId, _sessionToken, _sessionCookie, fromDate, toDate);
      if (!ttResult.ok && ttResult.expired) {
        const loginRetry = await _login(cfg.username, cfg.password);
        if (!loginRetry.ok) return { success: false, error: loginRetry.error };
        _sessionToken = loginRetry.token;
        _sessionCookie = loginRetry.cookieStr;
        ttResult = await _fetchTimetable(resolvedStudentId, _sessionToken, _sessionCookie, fromDate, toDate);
      }

      let ttDiag = '';
      if (ttResult.ok && ttResult.data) {
        await _mapAndSaveTimetable(ttResult.data);
        const savedTT = await storage.getTimetable() || [];
        ttDiag = `TT OK (${savedTT.length} classes)`;
      } else {
        ttDiag = `TT FAIL: ${ttResult.error || 'unknown'}`;
      }

      // Step 4: Map and save daily attendance
      let imported = 0;
      if (attResult.ok && attResult.data) {
        imported = await _mapAndSaveDailyAttendance(attResult.data);
      }

      await storage.saveLinwaysConfig({ ...cfg, studentId: resolvedStudentId || studentId, lastSyncedAt: new Date().toISOString() });

      // Diagnostic: include timetable debug info in result
      const savedTT = await storage.getTimetable() || [];
      return { success: true, imported, debug: `sid=${resolvedStudentId || '(none)'}, token=${_sessionToken ? _sessionToken.substring(0, 20) + '...' : '(none)'}, ${ttDiag}, savedTT=${savedTT.length} entries` };
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
    } catch (e) { }

    // logging in using pure fetch
    let status = 0;
    let responseData: any = null;
    try {
      const res = await fetchWithTimeout(LOGIN_URL, {
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
      } catch (e) { }
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

    let jwtToken = '';
    if (responseData) {
      const candidateJwt = responseData.data?.accessToken || responseData.accessToken || responseData.data?.token || responseData.token || '';
      if (typeof candidateJwt === 'string' && candidateJwt.startsWith('ey')) {
        jwtToken = candidateJwt;
      }
    }

    let cookieStr = '';
    if (CookieManager) {
      try {
        const cookies = await CookieManager.get('https://presidencyuniversity.linways.com') || {};
        const cookiesBase = await CookieManager.get('https://linways.com') || {};
        const allCookies = { ...cookiesBase, ...cookies };
        if (Object.keys(allCookies).length > 0) {
          cookieStr = Object.keys(allCookies).map(k => `${k}=${allCookies[k].value}`).join('; ');
        }
        if (!jwtToken) {
          const authCookie = allCookies['AUTH_SESSION'] || allCookies['auth_session'] || Object.values(allCookies).find((c: any) => c.value && String(c.value).startsWith('ey'));
          if (authCookie && authCookie.value) {
            jwtToken = authCookie.value;
          }
        }
      } catch (e) {
        console.warn('[LinwaysSync] CookieManager extraction failed:', e);
      }
    }

    let studentId = '';
    let profileData: any = null;

    // Strategy 1: Direct from decoded JWT (authoritative on Linways)
    if (jwtToken) {
      const payload = _decodeJwt(jwtToken);
      if (payload) {
        const d = payload.data || payload;
        const candidateId = d?.userId || d?.studentId || d?.id || d?.user?.id || d?.student?.id || payload?.userId;
        if (candidateId) {
          studentId = String(candidateId);
          console.log('[LinwaysSync] studentId from JWT:', studentId);
        }
        const candidateName = d?.userName || d?.name || d?.fullName || d?.studentName || d?.displayName;
        if (candidateName) {
          profileData = { name: candidateName };
          await storage.saveProfile({ name: candidateName });
        }
      }
    }

    // Strategy 2: Direct from response body if still missing
    if (responseData) {
      const d = responseData.data || responseData;
      if (!studentId) {
        const idFromResp = d?.userId || d?.studentId || d?.id || responseData?.studentId || responseData?.userId;
        if (idFromResp) studentId = String(idFromResp);
      }
      if (!profileData) {
        const nameFromResp = d?.name || d?.fullName || d?.studentName || d?.displayName || d?.userName;
        if (nameFromResp) {
          profileData = { name: nameFromResp };
          await storage.saveProfile({ name: nameFromResp });
        }
      }
    }

    // Strategy 3: HTML fallback if studentId still not found
    if (!studentId) {
      try {
        const homeRes = await fetchWithTimeout(PROFILE_URL, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Cookie': cookieStr,
            'Authorization': jwtToken ? `Bearer ${jwtToken}` : ''
          }
        });
        const html = await homeRes.text();
        const idMatch = html.match(/(?:studentId|userId|student_id|stdId|user_id|uid)\s*[:=]\s*['"]?(\d+)['"]?/i);
        if (idMatch && idMatch[1]) {
          studentId = idMatch[1];
        }
        if (!studentId) {
          const attrMatch = html.match(/(?:data-student-id|data-user-id|id=["']student_id["']\s+value)=["']?(\d+)["']?/i);
          if (attrMatch && attrMatch[1]) {
            studentId = attrMatch[1];
          }
        }
        if (!profileData) {
          const nameMatch = html.match(/class=["'][a-zA-Z0-9_\-\s]*name[a-zA-Z0-9_\-\s]*["'][^>]*>([^<]{2,50})</i);
          if (nameMatch && nameMatch[1]) {
            const cleanName = nameMatch[1].trim();
            if (cleanName && !cleanName.includes('{')) {
              profileData = { name: cleanName };
              await storage.saveProfile({ name: cleanName });
            }
          }
        }
      } catch (e) {
        console.warn('[LinwaysSync] HTML fallback failed:', e);
      }
    }

    // Strategy 4: Student Basic Details endpoint fallback
    if (!studentId) {
      try {
        const detailsRes = await fetchWithTimeout(`${LINWAYS_BASE}/academics/api/v1/student/get-student-basic-details?studentId=`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Cookie': cookieStr,
            'Authorization': jwtToken ? `Bearer ${jwtToken}` : ''
          }
        });
        if (detailsRes.ok) {
          const detailsJson = await detailsRes.json();
          const d = detailsJson?.data || detailsJson;
          const extractedId = d?.studentId || d?.userId || d?.id;
          if (extractedId) {
            studentId = String(extractedId);
            console.log('[LinwaysSync] Strategy D: Extracted studentId from basic-details endpoint:', studentId);
          }
          const extractedName = d?.name || d?.fullName || d?.studentName;
          if (extractedName && !profileData?.name) {
            profileData = { name: extractedName };
            await storage.saveProfile({ name: extractedName });
          }
        }
      } catch (err) {
        console.warn('[LinwaysSync] Strategy D (basic-details) failed:', err);
      }
    }

    if (!profileData) {
      console.warn('[LinwaysSync] Could not extract student name. Will show "Student".');
    }

    if (!studentId) {
      console.warn('[LinwaysSync] studentId not found in login response. Will rely on session cookie.');
    }

    return {
      ok: true,
      token: jwtToken,
      cookieStr,
      studentId,
      profile: profileData,
      responseData,
      jwtData: profileData
    };

  } catch (err) {
    return { ok: false, error: 'Cannot reach the university portal. Check your internet connection.' };
  }
}

async function _fetchTimetable(studentId: string, token: string | null, cookieStr: string | null, fromDate: string, toDate: string): Promise<any> {
  try {
    const stIdParam = studentId ? `studentId=${studentId}&` : '';
    const url = `${TIMETABLE_URL}?${stIdParam}getStudentAbsentStatus=true&fetchOnlyCurrentBatchDetails=false&getDaywise=true&fromDate=${fromDate}&toDate=${toDate}&includeIsOpenToAll=true&checkAttendanceMarkedDetails=true&requiredOtherStaffHour=true`;
    const headers: any = {
      'Content-Type': 'application/json',
      'Origin': 'https://presidencyuniversity.linways.com',
      'Referer': 'https://presidencyuniversity.linways.com/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
      'x-menu-code': 'STUDENT_LOGIN',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (cookieStr) {
      headers['Cookie'] = cookieStr;
    }

    const res = await fetchWithTimeout(url, {
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
  if (!payload || !payload.data) {
    console.warn('[LinwaysSync] _mapAndSaveTimetable: No payload data');
    return;
  }

  // Handle both flat array: [ { date: ... } ] and nested array: [ [ { date: ... } ], ... ]
  const rawData = payload.data;
  let days: any[] = [];
  if (Array.isArray(rawData)) {
    if (rawData.length > 0 && Array.isArray(rawData[0])) {
      days = rawData.flat().filter((x: any) => x && typeof x === 'object' && x.date);
    } else {
      days = rawData.filter((x: any) => x && typeof x === 'object' && x.date);
    }
  }

  if (days.length === 0) {
    console.warn('[LinwaysSync] No day records found in timetable payload');
    return;
  }

  // Check if timetable response contains student name
  const studentNameFromTT = payload.studentName || payload.name || payload.student_name || days[0]?.studentName || '';
  if (studentNameFromTT) {
    await storage.saveProfile({ name: studentNameFromTT });
  }

  // Sort days chronologically so later semester schedules replace earlier semester schedules
  days.sort((a, b) => {
    const da = _normaliseDate(a.date) || a.date;
    const db = _normaliseDate(b.date) || b.date;
    return String(da).localeCompare(String(db));
  });

  const newTimetableEntries: any[] = [];
  const dateClassMap: Record<string, any[]> = {};
  let earliestDate: string | null = null;
  const validDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (const day of days) {
    const dateRaw = day.date;
    const date = _normaliseDate(dateRaw);
    if (!date) continue;

    if (!earliestDate || date < earliestDate) {
      earliestDate = date;
    }

    const d = new Date(date);
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
      const lowerSub = subjectName.toLowerCase();
      if (/service\s*(batch|course)/i.test(lowerSub)) continue;

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

      // Store/update in weekly schedule (latest semester replaces earlier semester for same day & hour)
      const existsIndex = newTimetableEntries.findIndex(t =>
        t.day === weekday && t.hour === hour
      );
      if (existsIndex > -1) {
        newTimetableEntries[existsIndex] = classEntry;
      } else {
        newTimetableEntries.push(classEntry);
      }
    }
  }

  if (Object.keys(dateClassMap).length > 0) {
    await storage.importExactTimetableData(dateClassMap);
    console.log(`[LinwaysSync] Saved exact timetable for ${Object.keys(dateClassMap).length} dates`);
  }

  if (newTimetableEntries.length > 0) {
    await storage.saveTimetable(newTimetableEntries);
    console.log(`[LinwaysSync] Saved ${newTimetableEntries.length} recurring weekly classes`);
  }

  if (earliestDate) {
    const rawStartDate = await storage.getStartDate();
    if (earliestDate < rawStartDate) {
      await storage.saveStartDate(earliestDate);
    }
  }
}

async function _fetchDailyAttendance(studentId: string, token: string | null, cookieStr: string | null, fromDate: string, toDate: string): Promise<any> {
  try {
    const payloadObj: any = {
      toDate,
      fromDate,
      emitAsResetWhileReset: true
    };
    if (studentId) {
      payloadObj.studentId = String(studentId);
    }
    const params = JSON.stringify(payloadObj);

    const url = `${DAILY_ATTENDANCE_URL}?params=${encodeURIComponent(params)}`;
    const headers: any = {
      'Content-Type': 'application/json',
      'Origin': 'https://presidencyuniversity.linways.com',
      'Referer': 'https://presidencyuniversity.linways.com/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
      'x-menu-code': 'STUDENT_LOGIN',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (cookieStr) {
      headers['Cookie'] = cookieStr;
    }

    const res = await fetchWithTimeout(url, {
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
  } else if (payload && payload.data && Array.isArray(payload.data)) {
    entries = payload.data;
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

    const hourDetails = day.hourDetails || day.hours;
    if (hourDetails && Array.isArray(hourDetails)) {
      for (const hourDetail of hourDetails) {
        const hourStr = hourDetail.markedHour || hourDetail.hour || hourDetail.hourId;
        if (!hourStr) continue;
        const hour = parseInt(hourStr, 10);

        const subjectDetails = hourDetail.subjectDetails || hourDetail.subjects;
        if (subjectDetails && Array.isArray(subjectDetails)) {
          for (const subj of subjectDetails) {
            let cleanSubject = subj.subjectName || subj.subjectCode || subj.name || subj.code || '';
            if (!cleanSubject) continue;

            if (cleanSubject.includes('(')) {
              cleanSubject = cleanSubject.split('(')[0].trim();
            }
            const lowerSub = cleanSubject.toLowerCase();
            if (/service\s*(batch|course)/i.test(lowerSub)) continue;

            let status = "unmarked";
            const attStatusStr = String(subj.attendanceStatus).toLowerCase();

            if (attStatusStr === "1" || attStatusStr === "true" || attStatusStr === "a" || attStatusStr === "absent") {
              status = "absent";
            } else if (attStatusStr === "0" || attStatusStr === "false" || attStatusStr === "p" || attStatusStr === "present") {
              status = "present";
            }

            const dutyLeaveStr = String(subj.dutyLeave).toLowerCase();
            const grantLeaveStr = String(subj.grantLeave).toLowerCase();
            if (dutyLeaveStr === "1" || dutyLeaveStr === "true" || grantLeaveStr === "1" || grantLeaveStr === "true") {
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
