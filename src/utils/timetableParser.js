/**
 * Parses raw timetable text into structured data.
 * 
 * Extracts:
 * - Student Profile (Name, ID, Section, Semester)
 * - Subjects (Code -> Name)
 * - Timetable Entries (Day, Hour, StartTime, EndTime, Subject, Room)
 */

export const parseTimetableText = (text) => {
  const result = {
    profile: {
      name: '',
      studentId: '',
      section: '',
      semester: ''
    },
    subjects: [], // { code, name }
    entries: [],  // { day, hour, starttime, endtime, subject, room }
    errors: [],
    warnings: []
  };

  if (!text || typeof text !== 'string') return result;

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  let currentSection = null;
  
  // Maps subject code to subject name (to validate if entries use valid subjects)
  const subjectMap = new Map();

  // Helper to check if a value is just a placeholder label
  const isPlaceholder = (val) => {
    const v = val.toLowerCase();
    return v === 'name' || v === 'student id' || v === 'batch/section' || v === 'semester' || v.startsWith('* name');
  };

  const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  let currentDayContext = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();

    // Section detection for the explicit format
    if (lowerLine === 'student') {
      currentSection = 'student';
      continue;
    } else if (lowerLine === 'subjects') {
      currentSection = 'subjects';
      continue;
    } else if (lowerLine === 'timetable') {
      currentSection = 'timetable';
      continue;
    }

    // Detect standalone day names (for the condensed format)
    const matchedDay = validDays.find(d => d.toLowerCase() === lowerLine);
    if (matchedDay) {
      currentDayContext = matchedDay;
      continue;
    }

    if (currentSection === 'student') {
      // Basic heuristic for student details if formatted as a list
      if (line.startsWith('*')) {
        const val = line.substring(1).trim();
        if (!isPlaceholder(val)) {
          // Just fill them in order if we don't have them
          if (!result.profile.name) result.profile.name = val;
          else if (!result.profile.studentId) result.profile.studentId = val;
          else if (!result.profile.section) result.profile.section = val;
          else if (!result.profile.semester) result.profile.semester = val;
        }
      }
    } 
    else if (currentSection === 'subjects') {
      // Format: * CBC3413 — Blockchain in Financial Services
      // Or: * CBC3413 - Blockchain
      const subjectMatch = line.match(/^\*\s*([A-Za-z0-9]+)\s*[-—–]\s*(.+)$/);
      if (subjectMatch) {
        const code = subjectMatch[1].trim();
        const name = subjectMatch[2].trim();
        result.subjects.push({ code, name });
        subjectMap.set(code, name);
      }
    }
    
    // Timetable parsing (handles both explicit section format and condensed day-context format)
    if (currentSection === 'timetable' || currentDayContext) {
      // Format 1 (Explicit): * Monday | Hour 1 | 08:50–09:45 | CBC3413 | NV06
      const explicitMatch = line.match(/^\*\s*([A-Za-z]+)\s*\|\s*(?:[Hh]our\s*|[Hh])(\d+)\s*\|\s*(\d{1,2}:\d{2})\s*[-—–]\s*(\d{1,2}:\d{2})\s*\|\s*([^|]+?)\s*(?:\|\s*(.*))?$/);
      
      // Format 2 (Condensed): 1 | 08:50–09:45 | CBC3413 | Blockchain in Financial Services | NV06
      const condensedMatch = line.match(/^(\d+)\s*\|\s*(\d{1,2}:\d{2})\s*[-—–]\s*(\d{1,2}:\d{2})\s*\|\s*([^|]+)\s*\|\s*([^|]+)(?:\s*\|\s*(.*))?$/);
      
      if (explicitMatch) {
        let [_, day, hour, starttime, endtime, subjectCode, room] = explicitMatch;
        processTimetableEntry(day, hour, starttime, endtime, subjectCode, room, line, i);
      } 
      else if (condensedMatch && currentDayContext) {
        let [_, hour, starttime, endtime, subjectCode, subjectName, room] = condensedMatch;
        
        subjectCode = subjectCode.trim();
        subjectName = subjectName.trim();
        
        // Auto-register subject from condensed format
        if (!subjectMap.has(subjectCode)) {
          result.subjects.push({ code: subjectCode, name: subjectName });
          subjectMap.set(subjectCode, subjectName);
        }
        
        processTimetableEntry(currentDayContext, hour, starttime, endtime, subjectCode, room, line, i);
      }
      else if (currentSection === 'timetable' && line.startsWith('*')) {
        result.errors.push(`Line ${i + 1}: Could not parse timetable entry format: ${line}`);
      }
    }
  }

  function processTimetableEntry(day, hourStr, starttime, endtime, subjectCode, room, rawLine, lineIdx) {
    day = day.trim();
    const hour = parseInt(hourStr.trim(), 10);
    subjectCode = subjectCode.trim();
    room = room ? room.trim() : '';

    // Normalize day to title case
    day = day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();

    let isValid = true;
    
    if (!validDays.includes(day)) {
      result.errors.push(`Line ${lineIdx + 1}: Invalid day "${day}".`);
      isValid = false;
    }
    
    if (isNaN(hour) || hour < 1 || hour > 15) {
      result.errors.push(`Line ${lineIdx + 1}: Invalid hour "${hour}".`);
      isValid = false;
    }

    if (!subjectMap.has(subjectCode)) {
      result.warnings.push(`Line ${lineIdx + 1}: Subject code "${subjectCode}" was not found in Subjects section. It will be created automatically.`);
      result.subjects.push({ code: subjectCode, name: subjectCode });
      subjectMap.set(subjectCode, subjectCode);
    }

    if (isValid) {
      result.entries.push({ day, hour, starttime, endtime, subject: subjectCode, room });
    }
  }

  if (result.entries.length === 0 && result.subjects.length === 0) {
    result.errors.push("No timetable entries or subjects could be found. Please ensure the text matches the correct format.");
  }

  return result;
};
