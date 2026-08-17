import { useState } from 'react';
import { createPortal } from 'react-dom';
import { parseTimetableText } from '../utils/timetableParser';
import { storage } from '../services/storage';
import './TextImportModal.css';

export default function TextImportModal({ onClose }) {
  const [step, setStep] = useState('input'); // 'input', 'preview'
  const [rawText, setRawText] = useState('');
  const [parsedData, setParsedData] = useState(null);

  const handleAnalyze = () => {
    if (!rawText.trim()) {
      alert("Please paste your timetable text first.");
      return;
    }
    
    const result = parseTimetableText(rawText);
    setParsedData(result);
    setStep('preview');
  };

  const handleImport = () => {
    if (!parsedData || parsedData.entries.length === 0) return;
    
    storage.importTimetableData(parsedData.entries, parsedData.profile);
    
    alert(`Successfully imported ${parsedData.entries.length} classes!`);
    window.location.reload();
  };

  return createPortal(
    <div className="txt-import-portal">
      {/* Header */}
      <header className="tmng-header">
        <div className="tmng-header-inner">
          <button className="tmng-back-btn" onClick={step === 'preview' ? () => setStep('input') : onClose}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="tmng-title">{step === 'input' ? 'Import Timetable' : 'Import Preview'}</h2>
          <div style={{ width: 40 }} />
        </div>
      </header>

      <main className="txt-import-content">
        {step === 'input' ? (
          <>
            <p className="txt-import-sub">Paste your timetable data and import it automatically.</p>
            
            <textarea
              className="txt-import-textarea"
              placeholder="Paste your raw timetable text here..."
              value={rawText}
              onChange={e => setRawText(e.target.value)}
            />
            
            <button className="txt-import-primary-btn" onClick={handleAnalyze}>
              Analyze Timetable
            </button>
          </>
        ) : (
          <>
            <div className="txt-preview-summary">
              <div className="txt-preview-stat">
                <span className="txt-preview-num">{parsedData.subjects.length}</span>
                <span className="txt-preview-label">Subjects</span>
              </div>
              <div className="txt-preview-stat">
                <span className="txt-preview-num">{parsedData.entries.length}</span>
                <span className="txt-preview-label">Timetable Entries</span>
              </div>
            </div>

            {parsedData.errors.length > 0 && (
              <div className="txt-preview-alerts error">
                <div className="txt-alert-header">
                  <span className="material-symbols-outlined">error</span>
                  <span>Could not import some entries.</span>
                </div>
                <ul className="txt-alert-list">
                  {parsedData.errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            )}

            {parsedData.warnings.length > 0 && (
              <div className="txt-preview-alerts warning">
                <div className="txt-alert-header">
                  <span className="material-symbols-outlined">warning</span>
                  <span>Warnings</span>
                </div>
                <ul className="txt-alert-list">
                  {parsedData.warnings.map((warn, i) => <li key={i}>{warn}</li>)}
                </ul>
              </div>
            )}

            {parsedData.subjects.length > 0 && (
              <div className="txt-preview-section">
                <h3 className="txt-section-title">Subjects Found</h3>
                <div className="txt-subject-list">
                  {parsedData.subjects.map((sub, i) => (
                    <div key={i} className="txt-subject-item">
                      <span className="txt-sub-code">{sub.code}</span>
                      <span className="txt-sub-name">{sub.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="txt-preview-actions">
              <button 
                className="txt-import-primary-btn" 
                onClick={handleImport}
                disabled={parsedData.entries.length === 0}
              >
                Import {parsedData.entries.length} Classes
              </button>
              <button className="txt-import-secondary-btn" onClick={() => setStep('input')}>
                Cancel
              </button>
            </div>
          </>
        )}
      </main>
    </div>,
    document.body
  );
}
