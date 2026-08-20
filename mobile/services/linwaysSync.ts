import { storage } from './storage';

let CookieManager: any = null;
try {
  const mod = require('@react-native-cookies/cookies');
  CookieManager = mod.default || mod;
} catch (e) {
  console.warn('CookieManager native module not available in Expo Go');
}


let _sessionToken: string | null = null;

const LINWAYS_BASE = 'https://presidencyuniversity.linways.com';
const LOGIN_URL = `${LINWAYS_BASE}/academics/api/v1/auth/student-login-credentials`;
const ATTENDANCE_URL = `${LINWAYS_BASE}/academics/api/v1/timetable`;
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
      }



      const fromDate = await storage.getStartDate();
      const toDate = _formatDate(new Date());

      const fetchResult = await _fetchAttendance(cfg.studentId, _sessionToken, fromDate, toDate);
      if (!fetchResult.ok) {
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

      const imported = await _mapAndSave(fetchResult.data);

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

async function _login(username: string, password: string): Promise<any> {
  try {


    console.log('[LinwaysSync] Initial GET to establish session');
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

    const formBody = JSON.stringify({
      username: username,
      password: password,
      next: '',
      userType: 'STUDENT'
    });

    console.log('[LinwaysSync] _login request to', LOGIN_URL);
    const res = await fetch(LOGIN_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Origin': 'https://presidencyuniversity.linways.com',
        'Referer': 'https://presidencyuniversity.linways.com/ams/student/login',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'x-menu-code': 'STUDENT_LOGIN'
      },
      body: formBody,
      credentials: 'include',
    });

    console.log('[LinwaysSync] _login response: ' + res.status);
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: 'Invalid username or password. Please check your credentials.' };
    }
    
    if (!res.ok) {
      return { ok: false, error: `Login failed (HTTP ${res.status}). Please try again.` };
    }

    let token = '';
    
    let responseData = null;
    try {
      responseData = await res.json();
    } catch(e) {}

    if (CookieManager) {
      try {
        const cookies = await CookieManager.get('https://presidencyuniversity.linways.com') || {};
        const cookiesBase = await CookieManager.get('https://linways.com') || {};
        const allCookies = { ...cookiesBase, ...cookies };
        console.log('[LinwaysSync] Native cookies keys: ', Object.keys(allCookies).join(', '));
        if (allCookies['AUTH_SESSION']) {
          token = allCookies['AUTH_SESSION'].value;
        } else if (Object.keys(allCookies).length > 0) {
          token = Object.keys(allCookies).map(k => `${k}=${allCookies[k].value}`).join('; ');
        }
      } catch (e) {
        console.warn('Cookie extraction failed', e);
      }
    }

    if (!token) {
      try {
        const allHeaders: any = res.headers;
        const rawHeaders = allHeaders?.map || {};
        const setCookieHeaders = rawHeaders['set-cookie'] || [];
        
        const cookiesList = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
        
        const extractedCookies: string[] = [];
        cookiesList.forEach((cookieStr: string) => {
          if (cookieStr) {
            const cookieVal = cookieStr.split(';')[0];
            if (cookieVal) {
              extractedCookies.push(cookieVal);
              if (cookieVal.startsWith('AUTH_SESSION=')) {
                token = cookieVal.substring('AUTH_SESSION='.length);
              }
            }
          }
        });
        
        if (!token && extractedCookies.length > 0) {
          token = extractedCookies.join('; ');
        }
      } catch (e) {}
    }

    if (!token && responseData) {
      if (responseData.token) token = responseData.token;
      else if (responseData.data && responseData.data.token) token = responseData.data.token;
    }
    
    let studentId = '';
    let profileData = null;
    if (token && token.startsWith('ey')) {
      try {
        const parts = token.split('.');
        if (parts.length > 1) {
          let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          while (base64.length % 4) {
            base64 += '=';
          }
          
          // Custom base64 decode since atob is missing in pure RN
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
          let output = '';
          for (let bc = 0, bs = 0, buffer, i = 0; buffer = base64.charAt(i++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
            buffer = chars.indexOf(buffer);
          }
          
          const jsonPayload = decodeURIComponent(
            output.split('').map(function(c) {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join('')
          );
          
          const parsed = JSON.parse(jsonPayload);
          if (parsed?.data) {
            profileData = parsed.data;
            if (parsed.data.userId) {
              studentId = parsed.data.userId;
            }
          }
        }
      } catch (e) {
        console.warn('Failed to decode JWT for profile', e);
      }
    }

    return { ok: true, token, studentId, profile: profileData, responseData, jwtData: profileData };

  } catch (err) {
    return { ok: false, error: 'Cannot reach the university portal. Check your internet connection.' };
  }
}



async function _fetchAttendance(studentId: string, token: string | null, fromDate: string, toDate: string): Promise<any> {

  try {
    const url = `${ATTENDANCE_URL}?studentId=${studentId}&getStudentAbsentStatus=true&fetchOnlyCurrentBatchDetails=true&getDaywise=true&fromDate=${fromDate}&toDate=${toDate}&includeIsOpenToAll=true&checkAttendanceMarkedDetails=true&requiredOtherStaffHour=false`;
    const headers: any = { 
      'Content-Type': 'application/json',
      'Origin': 'https://presidencyuniversity.linways.com',
      'Referer': 'https://presidencyuniversity.linways.com/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    };
    
    if (token && token.startsWith('ey')) {
      headers['Authorization'] = `Bearer ${token}`;
    } else if (token) {
      headers['Cookie'] = token;
    }

    console.log('[LinwaysSync] _fetchAttendance request sent');
    const res = await fetch(url, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    console.log('[LinwaysSync] _fetchAttendance response: ' + res.status);
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

async function _mapAndSave(payload: any) {
  let count = 0;
  
  if (!payload || !payload.data || !Array.isArray(payload.data)) {
    return count;
  }

  const newTimetableEntries: any[] = [];
  for (const day of payload.data) {
    const dateRaw = day.date;
    const date = _normaliseDate(dateRaw);
    if (!date) continue;

    // Determine the actual weekday (Monday, Tuesday, etc.) to map into the app's timetable
    const d = new Date(date);
    const validDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekday = validDays[d.getDay()];

    if (!day.hours || !Array.isArray(day.hours)) continue;

    for (const hourObj of day.hours) {
      const timeTable = hourObj.timeTables?.[0];
      if (!timeTable) continue;

      const hour = parseInt(hourObj.hour || timeTable.hour || '1', 10);
      let subjectName = timeTable.subjects?.[0]?.name;
      if (!subjectName) {
        subjectName = timeTable.subjects?.[0]?.code || timeTable.clusterName || 'Unknown Subject';
      }

      // 1. Build the timetable entry (so stats and calendar can see the subject)
      const starttime = timeTable.fromTime ? timeTable.fromTime.substring(0, 5) : '';
      const endtime = timeTable.toTime ? timeTable.toTime.substring(0, 5) : '';
      const room = timeTable.classroomCode || '';

      // Only push unique timetable combinations
      const exists = newTimetableEntries.find(t => 
        t.day === weekday && t.hour === hour && t.subject === subjectName
      );
      if (!exists) {
        newTimetableEntries.push({
          day: weekday,
          hour,
          starttime,
          endtime,
          subject: subjectName,
          room
        });
      }

      // 2. Add attendance record (only if explicitly marked)
      if (timeTable.attendanceMarked === "1") {
        const isAbsent = timeTable.isAbsent === "1";
        const status = isAbsent ? 'absent' : 'present';

        await storage.addRecord({
          date,
          subject: subjectName,
          hour: hour,
          status,
        });
        count++;
      }
    }
  }

  if (newTimetableEntries.length > 0) {
    await storage.importTimetableData(newTimetableEntries);
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
