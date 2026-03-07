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

  const handleGenerate = async () => {
    setMode('generate');
    try {
      const text = generateShareCode();
      const url = await QRCode.toDataURL(text, { width: 300, margin: 2, color: { dark: '#1e293b', light: '#ffffff' } });
      setQrSrc(url);
    } catch (e) {
      console.error(e);
      alert('Failed to generate QR');
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
      
      if (text.startsWith('TT3:') || text.startsWith('TT2:') || text.startsWith('TT1:')) {
        jsonStr = LZString.decompressFromBase64(text.substring(4));
        if (!jsonStr) {
           jsonStr = LZString.decompressFromEncodedURIComponent(text.substring(4));
        }
      }
      
      const data = JSON.parse(jsonStr);
      let importedTt = [];
      let importedHolidays = [];
      
      if (Array.isArray(data)) {
         importedTt = data;
      } else if (data.timetable) {
         importedTt = data.timetable;
         if (data.holidays) importedHolidays = data.holidays;
      } else if (data.tt) {
         importedTt = data.tt.map(t => ({
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
         if (data.holidays) {
            importedHolidays = data.holidays.map(h => ({
              date: h.d,
              name: h.n
            }));
         }
      } else {
         throw new Error("Invalid format");
      }
      
      if (importedTt.length > 0) {
          storage.saveTimetable(importedTt);
      }
      if (importedHolidays.length > 0) {
          storage.saveHolidays(importedHolidays);
      }
      
      alert("Timetable imported successfully!");
      onClose();
    } catch(e) {
      alert("Invalid code or format unsupported. " + e.message);
    }
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
            <button className="menu-btn" onClick={handleGenerate}>
              <div className="icon">📱</div>
              <div style={{textAlign: 'left'}}>
                <strong>Generate QR</strong>
                <div className="card-hint" style={{margin:0}}>Show code to your friend</div>
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
                placeholder="TT3:..."
              />
            </div>
            <button className="save-btn" style={{width: '100%'}} onClick={handlePasteSubmit}>Import</button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
