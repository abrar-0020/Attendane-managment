import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import { Html5QrcodeScanner } from 'html5-qrcode';
import LZString from 'lz-string';
import { storage } from '../services/storage';
import './ShareTimetable.css';

export default function ShareTimetable({ onClose }) {
  const [mode, setMode] = useState('menu'); // menu, generate, scan, paste
  const [qrSrc, setQrSrc] = useState('');
  const [pasteText, setPasteText] = useState('');
  const scannerRef = useRef(null);

  const generateShareCode = () => {
    const data = {
      timetable: storage.getTimetable(),
      holidays: storage.getHolidays()
    };
    const jsonStr = JSON.stringify(data);
    const compressed = LZString.compressToBase64(jsonStr);
    return `TT3:${compressed}`;
  };

  const [pendingBackupData, setPendingBackupData] = useState(null);

  const generateBackupCode = () => {
    const data = {
      v: 1,
      tt: storage.getTimetable().map(t => ({
         d: (t.day || '').substring(0,3),
         h: t.hour,
         s: t.starttime,
         e: t.endtime,
         c: t.subject,
         r: t.room || '',
         sd: t.startDate || ''
      })),
      hd: storage.getHolidays().map(h => ({ d: h.date, n: h.name })),
      ar: storage.getRecords().map(r => ({ d: r.date, h: r.hour, s: r.subject, st: r.status })),
      sd: storage.getStartDate(),
      bc: storage.getBaseCounts()
    };
    const jsonStr = JSON.stringify(data);
    const compressed = LZString.compressToBase64(jsonStr);
    return `AD1:${compressed}`;
  };

  const handleGenerate = async (isBackup = false) => {
    if (isBackup) {
      setMode('backup-text');
      setPasteText(generateBackupCode());
      return;
    }
    
    setMode('generate');
    setPasteText('share');
    try {
      const text = generateShareCode();
      const url = await QRCode.toDataURL(text, { width: 300, margin: 2, color: { dark: '#1e293b', light: '#ffffff' } });
      setQrSrc(url);
    } catch (e) {
      console.error(e);
      alert('Failed to generate QR. Your timetable might be too large.');
    }
  };

  const handleScanInit = () => {
    setMode('scan');
  };

  useEffect(() => {
    if (mode === 'scan') {
      scannerRef.current = new Html5QrcodeScanner("reader", { fps: 10, qrbox: {width: 250, height: 250} }, false);
      scannerRef.current.render(onScanSuccess, onScanFailure);
    }
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error(e));
      }
    };
  }, [mode]);

  const onScanSuccess = (decodedText) => {
    if (scannerRef.current) scannerRef.current.clear();
    processImport(decodedText);
  };

  const onScanFailure = () => {};

  const handlePasteSubmit = () => {
    processImport(pasteText);
  };

  const processImport = (text) => {
    try {
      let jsonStr = text.trim();
      let isTT4 = text.startsWith('TT4:');
      let isAD1 = text.startsWith('AD1:');
      let isFullBackup = isTT4 || isAD1;
      
      if (isFullBackup || text.startsWith('TT3:') || text.startsWith('TT2:') || text.startsWith('TT1:')) {
        jsonStr = LZString.decompressFromBase64(text.substring(4));
        if (!jsonStr) {
           jsonStr = LZString.decompressFromEncodedURIComponent(text.substring(4));
        }
      }
      
      const data = JSON.parse(jsonStr);
      let importedData = {
          timetable: [],
          holidays: [],
          records: null,
          baseCounts: null,
          startDate: null
      };
      
      if (Array.isArray(data)) {
         importedData.timetable = data;
      } else if (data.timetable) {
         importedData = { ...importedData, ...data };
      } else if (data.tt) {
         importedData.timetable = data.tt.map(t => ({
           day: t.d === 'Mon' ? 'Monday' : 
                t.d === 'Tue' ? 'Tuesday' :
                t.d === 'Wed' ? 'Wednesday' :
                t.d === 'Thu' ? 'Thursday' :
                t.d === 'Fri' ? 'Friday' :
                t.d === 'Sat' ? 'Saturday' : t.d,
           hour: parseInt(t.h),
           starttime: t.s,
           endtime: t.e,
           subject: t.c,
           room: t.r || '',
           startDate: t.sd || ''
         }));
         
         if (data.hd || data.holidays) {
            let hSrc = data.hd || data.holidays;
            importedData.holidays = hSrc.map(h => ({
              date: h.d || h.date,
              name: h.n || h.name
            }));
         }
         
         if (data.ar || data.records) {
            let rSrc = data.ar || data.records;
            importedData.records = rSrc.map(r => ({
              date: r.d || r.date,
              hour: r.h || r.hour,
              subject: r.s || r.subject,
              status: r.st || r.status
            }));
         }
         
         if (data.sd) importedData.startDate = data.sd;
         if (data.bc) importedData.baseCounts = data.bc;

      } else {
         throw new Error("Invalid format");
      }
      
      if (isFullBackup) {
          setPendingBackupData(importedData);
          setMode('confirm-backup');
          return;
      }
      
      if (importedData.timetable.length > 0) {
          storage.saveTimetable(importedData.timetable);
      }
      if (importedData.holidays.length > 0) {
          storage.saveHolidays(importedData.holidays);
      }
      
      alert("Timetable imported successfully!");
      onClose();
    } catch(e) {
      alert("Invalid code or format unsupported. " + e.message);
    }
  };

  const handleConfirmRestore = () => {
    if (!pendingBackupData) return;
    
    // Bypass React state-helpers and storage wrapper entirely to avoid unmount race conditions
    // Hardwrite into localStorage directly before the location.reload happens
    if (pendingBackupData.timetable) localStorage.setItem('attendance_timetable', JSON.stringify(pendingBackupData.timetable));
    if (pendingBackupData.holidays) localStorage.setItem('attendance_holidays', JSON.stringify(pendingBackupData.holidays));
    if (pendingBackupData.records) localStorage.setItem('attendance_records', JSON.stringify(pendingBackupData.records));
    if (pendingBackupData.baseCounts) localStorage.setItem('attendance_base_counts', JSON.stringify(pendingBackupData.baseCounts));
    if (pendingBackupData.startDate) localStorage.setItem('semester_start_date', JSON.stringify(pendingBackupData.startDate));
    
    alert("Full Backup imported successfully! The app will now reload.");
    window.location.reload();
  };

  return createPortal(
    <div className="fullscreen-portal mng-portal">
      <div className="portal-header">
        <button className="back-btn" onClick={() => mode === 'menu' ? onClose() : setMode('menu')}>← Back</button>
        <h2>Share & Import</h2>
      </div>

      <div className="portal-content">
        {mode === 'menu' && (
          <div className="share-menu grid-menu">
            <button className="menu-btn" onClick={() => handleGenerate(false)}>
              <div className="icon">📱</div>
              <div style={{textAlign: 'left'}}>
                <strong>Share Timetable</strong>
                <div className="card-hint" style={{margin:0}}>Share base schedule via QR/Text</div>
              </div>
            </button>
            
            <button className="menu-btn" onClick={() => handleGenerate(true)}>
              <div className="icon">💾</div>
              <div style={{textAlign: 'left'}}>
                <strong>My Data Backup</strong>
                <div className="card-hint" style={{margin:0}}>Export timetable + full attendance</div>
              </div>
            </button>
            
            <button className="menu-btn" onClick={handleScanInit}>
              <div className="icon">📷</div>
              <div style={{textAlign: 'left'}}>
                <strong>Scan QR</strong>
                <div className="card-hint" style={{margin:0}}>Scan a friend's code</div>
              </div>
            </button>
            
            <button className="menu-btn" onClick={() => setMode('paste')}>
              <div className="icon">📋</div>
              <div style={{textAlign: 'left'}}>
                <strong>Paste Text</strong>
                <div className="card-hint" style={{margin:0}}>Import via text snippet</div>
              </div>
            </button>
          </div>
        )}
        
        {mode === 'generate' && (
          <div className="qr-display">
            <h3>Scan this Code</h3>
            {qrSrc ? <img src={qrSrc} alt="QR Code" /> : <p>Generating...</p>}
            <button className="copy-btn" onClick={() => {
              navigator.clipboard.writeText(generateShareCode());
              alert('Copied text code to clipboard!');
            }}>Copy Text Version</button>
          </div>
        )}

        {mode === 'backup-text' && (
          <div className="paste-container add-form" style={{textAlign: 'center'}}>
            <h3>Full Backup Generated</h3>
            <p className="subtitle" style={{marginBottom: '16px'}}>This backup is too large for a QR code. Please copy the text below and keep it somewhere safe.</p>
            <div className="form-group">
              <textarea 
                rows={6}
                readOnly
                style={{width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f8fafc'}}
                value={pasteText} 
              />
            </div>
            <button className="save-btn" style={{width: '100%', marginTop: '12px'}} onClick={() => {
              navigator.clipboard.writeText(pasteText);
              alert('Backup code copied to clipboard!');
            }}>Copy Backup Code</button>
          </div>
        )}

        {mode === 'scan' && (
          <div className="scanner-container">
            <h3>Scan QR Code</h3>
            <div id="reader" width="100%"></div>
          </div>
        )}

        {mode === 'paste' && (
          <div className="paste-container add-form">
            <h3>Paste Code</h3>
            <div className="form-group">
              <textarea 
                rows={6}
                style={{width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1'}}
                value={pasteText} 
                onChange={e => setPasteText(e.target.value)} 
                placeholder="AD1:..."
              />
            </div>
            <button className="save-btn" style={{width: '100%'}} onClick={handlePasteSubmit}>Import</button>
          </div>
        )}

        {mode === 'confirm-backup' && pendingBackupData && (
          <div className="confirm-container" style={{textAlign: 'center', padding: '20px'}}>
            <h3 style={{marginBottom: '16px', color: '#1e293b'}}>Restore Backup?</h3>
            <div style={{background: '#f8fafc', padding: '16px', borderRadius: '16px', textAlign: 'left', marginBottom: '24px'}}>
              <p style={{margin: '0 0 8px 0', fontSize: '15px'}}><strong>{pendingBackupData.timetable?.length || 0}</strong> classes</p>
              <p style={{margin: '0 0 8px 0', fontSize: '15px'}}><strong>{pendingBackupData.records?.length || 0}</strong> attendance records</p>
              <p style={{margin: '0', fontSize: '15px'}}><strong>{pendingBackupData.holidays?.length || 0}</strong> holidays</p>
            </div>
            <p style={{fontSize: '14px', color: '#64748b', marginBottom: '24px'}}>This will completely replace all your current data on this device.</p>
            
            <button className="save-btn" style={{width: '100%', marginBottom: '12px'}} onClick={handleConfirmRestore}>
              Restore All Data
            </button>
            <button className="cancel-btn" style={{width: '100%'}} onClick={() => setMode('menu')}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
