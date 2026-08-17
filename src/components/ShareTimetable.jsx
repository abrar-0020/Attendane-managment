import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import LZString from 'lz-string';
import { QRCodeSVG } from 'qrcode.react';
import { storage } from '../services/storage';
import './ShareTimetable.css';

export default function ShareTimetable({ onClose, initialImportCode }) {
  const [shareCode, setShareCode] = useState('');
  const [shortDisplayCode, setShortDisplayCode] = useState('');
  const [copyDone, setCopyDone] = useState(false);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    if (initialImportCode) return; // Don't generate a code if we are importing

    // Generate the full payload
    const data = { timetable: storage.getTimetable(), holidays: storage.getHolidays() };
    const compressed = LZString.compressToBase64(JSON.stringify(data));
    const fullCode = `TT3:${compressed}`;
    const url = `https://attendme.app/t/${encodeURIComponent(fullCode)}`;
    
    setShareCode(url);
    
    // Generate a visual "short code" from the hash for display
    const hash = Math.abs(fullCode.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0));
    setShortDisplayCode(`AM-${hash.toString(36).toUpperCase().slice(0, 5).padEnd(5, 'X')}`);
  }, [initialImportCode]);

  const processImport = () => {
    try {
      let code = initialImportCode;
      if (code.includes('/t/')) code = decodeURIComponent(code.split('/t/')[1]);
      else if (code.includes('?share=')) code = decodeURIComponent(code.split('?share=')[1]);
      
      let jsonStr = code;
      if (code.startsWith('TT3:') || code.startsWith('TT2:') || code.startsWith('TT1:')) {
        jsonStr = LZString.decompressFromBase64(code.substring(4));
        if (!jsonStr) jsonStr = LZString.decompressFromEncodedURIComponent(code.substring(4));
      }

      const data = JSON.parse(jsonStr);
      let importedTt = Array.isArray(data) ? data : (data.timetable || []);
      let importedHolidays = data.holidays || [];

      if (importedTt.length > 0) {
        storage.importTimetableData(importedTt);
        if (importedHolidays.length > 0) localStorage.setItem('attendance_holidays', JSON.stringify(importedHolidays));
        alert('Timetable imported successfully!');
        window.location.reload();
      } else {
        throw new Error("No classes found");
      }
    } catch (e) {
      alert("Invalid or broken link. Could not import timetable.");
      onClose();
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareCode);
    setCopyDone(true);
    setTimeout(() => setCopyDone(false), 2000);
  };

  const handleMessages = () => {
    window.location.href = `sms:?body=Import my timetable: ${shareCode}`;
  };

  const handleMail = () => {
    window.location.href = `mailto:?subject=My Timetable&body=Import my timetable: ${shareCode}`;
  };

  const handleMore = () => {
    if (navigator.share) {
      navigator.share({
        title: 'AttendMe Timetable',
        text: 'Import my timetable in AttendMe!',
        url: shareCode
      }).catch(console.error);
    } else {
      handleCopy();
    }
  };

  return createPortal(
    <div className="share-overlay" onClick={onClose}>
      <div className="share-scrim" />
      <div className="share-sheet" onClick={e => e.stopPropagation()}>
        <div className="share-drag-handle" />

        {initialImportCode ? (
          <>
            <h2 className="share-title">Import Timetable</h2>
            <p style={{ textAlign: 'center', marginBottom: '24px', color: 'var(--on-surface-variant)', fontSize: '14px' }}>
              You are about to import a shared timetable. This will add the new classes to your schedule.
            </p>
            <button className="share-btn-primary" onClick={processImport}>
              <span className="material-symbols-outlined">download</span>
              Import Now
            </button>
            <button className="share-btn-primary" style={{ background: 'transparent', color: 'var(--on-surface)', marginTop: '12px' }} onClick={onClose}>
              Cancel
            </button>
          </>
        ) : !showQR ? (
          <>
            <h2 className="share-title">Share your timetable</h2>

            <div className="share-box">
              <span className="share-box-label">SHARE CODE</span>
              <span className="share-box-value" title="Copies full import link">{shortDisplayCode}</span>
            </div>

            <button className="share-btn-primary" onClick={handleCopy}>
              <span className="material-symbols-outlined">{copyDone ? 'check' : 'content_copy'}</span>
              {copyDone ? 'Copied!' : 'Copy code'}
            </button>

            <div className="share-divider">
              <span className="share-divider-text">or share via</span>
            </div>

            <div className="share-actions">
              <button className="share-action-btn" onClick={handleMessages}>
                <div className="share-action-icon">
                  <span className="material-symbols-outlined">chat</span>
                </div>
                <span className="share-action-label">Messages</span>
              </button>
              
              <button className="share-action-btn" onClick={handleMail}>
                <div className="share-action-icon">
                  <span className="material-symbols-outlined">mail</span>
                </div>
                <span className="share-action-label">Mail</span>
              </button>
              
              <button className="share-action-btn" onClick={() => setShowQR(true)}>
                <div className="share-action-icon">
                  <span className="material-symbols-outlined">qr_code_scanner</span>
                </div>
                <span className="share-action-label">QR Code</span>
              </button>
              
              <button className="share-action-btn" onClick={handleMore}>
                <div className="share-action-icon">
                  <span className="material-symbols-outlined">more_horiz</span>
                </div>
                <span className="share-action-label">More</span>
              </button>
            </div>
          </>
        ) : (
          <div className="share-qr-view">
            <button className="share-back-btn" onClick={() => setShowQR(false)}>
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h2 className="share-title">Scan QR Code</h2>
            <p className="share-sub">Scan this from another device to import.</p>
            <div className="share-qr-container">
              <QRCodeSVG value={shareCode} size={250} level={"M"} />
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
