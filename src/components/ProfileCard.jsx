import { useState, useRef } from 'react';
import { storage } from '../services/storage';

export default function ProfileCard() {
  const [profile, setProfile] = useState(() => storage.getProfile() || { name: 'Student', roll: '', section: '', photo: null });
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ ...profile });
  const fileInputRef = useRef(null);

  const handleSave = () => {
    storage.saveProfile(editForm);
    setProfile(editForm);
    setIsEditing(false);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check size < 2MB
    if (file.size > 2 * 1024 * 1024) {
      alert('File too large. Max 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setEditForm(prev => ({ ...prev, photo: event.target.result }));
    };
    reader.readAsDataURL(file);
  };

  if (isEditing) {
    return (
      <div className="profile-card editing">
        <div className="photo-edit" onClick={() => fileInputRef.current?.click()}>
          {editForm.photo ? (
            <img src={editForm.photo} alt="Profile" className="profile-img" />
          ) : (
            <div className="profile-placeholder">{editForm.name.charAt(0) || '?'}</div>
          )}
          <div className="photo-overlay">📷</div>
          <input type="file" accept="image/*" hidden ref={fileInputRef} onChange={handlePhotoUpload} />
        </div>
        
        <div className="edit-fields">
          <input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="Name" />
          <input value={editForm.roll} onChange={e => setEditForm({...editForm, roll: e.target.value})} placeholder="Roll No" />
          <input value={editForm.section} onChange={e => setEditForm({...editForm, section: e.target.value})} placeholder="Section" />
        </div>
        
        <div className="edit-actions">
          <button className="cancel-btn" onClick={() => { setEditForm(profile); setIsEditing(false); }}>Cancel</button>
          <button className="save-btn" onClick={handleSave}>Save</button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-card">
      <div className="profile-content">
        <div className="profile-photo">
          {profile.photo ? (
            <img src={profile.photo} alt="Profile" className="profile-img" />
          ) : (
             <div className="profile-placeholder">{profile.name.charAt(0) || '?'}</div>
          )}
        </div>
        <div className="profile-info">
          <h2>{profile.name}</h2>
          <p>{profile.roll} {profile.section ? `• Sec ${profile.section}` : ''}</p>
        </div>
      </div>
      <button className="edit-profile-btn" onClick={() => setIsEditing(true)}>Edit</button>
    </div>
  );
}
