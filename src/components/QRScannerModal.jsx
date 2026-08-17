import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import LZString from 'lz-string';
import { storage } from '../services/storage';
import './QRScannerModal.css';

export default function QRScannerModal({ onClose }) {
  const [error, setError] = useState('');
  const scannerRef = useRef(null);

  useEffect(() => {
    // Initialize scanner
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 }, supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA] },
      /* verbose= */ false
    );
    scannerRef.current = scanner;

    scanner.render(onScanSuccess, onScanFailure);

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, []);

  const onScanSuccess = (decodedText) => {
    if (scannerRef.current) {
      scannerRef.current.clear();
    }
    processImport(decodedText);
  };

  const onScanFailure = (error) => {
    // Ignore routine scan failures (when no QR is in view)
  };

  const processImport = (text) => {
    try {
      let jsonStr = text.trim();
      
      try {
        const urlObj = new URL(jsonStr);
        const shareParam = urlObj.searchParams.get('share');
        if (shareParam) jsonStr = shareParam.trim();
      } catch (e) { /* not a URL */ }

      let isTT4 = jsonStr.startsWith('TT4:');
      let isAD1 = jsonStr.startsWith('AD1:');
      let isFullBackup = isTT4 || isAD1;

      if (isFullBackup || jsonStr.startsWith('TT3:') || jsonStr.startsWith('TT2:') || jsonStr.startsWith('TT1:')) {
        let compressed = jsonStr.substring(4);
        jsonStr = LZString.decompressFromBase64(compressed) || LZString.decompressFromEncodedURIComponent(compressed);
      }

      if (!jsonStr) throw new Error("Could not decompress data.");

      const data = JSON.parse(jsonStr);
      let importedData = { timetable: [], holidays: [] };

      if (Array.isArray(data)) {
        importedData.timetable = data;
      } else if (data.timetable) {
        importedData = { ...importedData, ...data };
      } else if (data.tt) {
        const dayMap = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday' };
        importedData.timetable = data.tt.map(t => ({
          day: dayMap[t.d] || t.d, hour: parseInt(t.h), starttime: t.s, endtime: t.e,
          subject: t.c, room: t.r || ''
        }));
      }

      if (importedData.timetable.length === 0) throw new Error("No classes found in QR Code");

      if (window.confirm(`Found ${importedData.timetable.length} classes. Import them now?`)) {
        storage.importTimetableData(importedData.timetable);
        alert("Imported successfully!");
        window.location.reload();
      } else {
        onClose();
      }
    } catch (e) {
      setError("Invalid QR Code: " + e.message);
      // Restart scanner after failure so they can try again
      setTimeout(() => {
        setError('');
        if (scannerRef.current) {
          scannerRef.current.render(onScanSuccess, onScanFailure);
        }
      }, 3000);
    }
  };

  return createPortal(
    <div className="qr-overlay">
      <div className="qr-scrim" onClick={onClose} />
      <div className="qr-sheet">
        <button className="qr-close-btn" onClick={onClose}>
          <span className="material-symbols-outlined">close</span>
        </button>
        <h2 className="qr-title">Scan QR Code</h2>
        <p className="qr-sub">Point your camera at an AttendMe QR code.</p>
        
        {error ? (
          <div className="qr-error">
            <span className="material-symbols-outlined">error</span>
            <p>{error}</p>
          </div>
        ) : (
          <div id="qr-reader" className="qr-reader-container"></div>
        )}
      </div>
    </div>,
    document.body
  );
}
