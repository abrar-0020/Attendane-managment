import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, SafeAreaView, Switch, Alert } from 'react-native';
import { Text } from '@/components/Text';
import { MaterialIcons } from '@expo/vector-icons';
import { storage } from '../../services/storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { notificationService } from '../../services/notifications';
import { useThemeContext } from '../../context/ThemeContext';

export default function SettingsView() {
  const router = useRouter();
  const { theme, isDark, toggleTheme } = useThemeContext();
  const styles = makeStyles(theme);
  
  const [startDate, setStartDate] = useState('');
  const [notifPrefs, setNotifPrefs] = useState<any>({ classReminders: false, lowAttendanceAlert: false, attendanceThreshold: 75, reminderMinutes: 10 });
  const [profile, setProfile] = useState<any>({});
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState({ name: '', roll: '', section: '' });
  
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [editDateData, setEditDateData] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const sDate = await storage.getStartDate();
    setStartDate(sDate);
    
    const prefs = await storage.getNotificationPrefs();
    setNotifPrefs(prefs);
    
    const p = (await storage.getProfile()) || {};
    setProfile(p);
    setEditProfileData({ name: p.name || '', roll: p.roll || '', section: p.section || '' });
    
    const t = await storage.getTheme();
  };

  const handleSaveProfile = async () => {
    if (!editProfileData.name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    const updated = { ...profile, ...editProfileData };
    await storage.saveProfile(updated);
    setProfile(updated);
    setIsEditingProfile(false);
  };

  const handleSaveDate = async () => {
    if (!editDateData.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert('Format Error', 'Please use YYYY-MM-DD format (e.g., 2026-08-05)');
      return;
    }
    await storage.saveStartDate(editDateData);
    setStartDate(editDateData);
    setIsEditingDate(false);
  };

  const handleToggleTheme = async (val: boolean) => {
    toggleTheme(val);
  };

  const clearAllData = () => {
    Alert.alert(
      "Clear All Data",
      "Are you sure you want to delete all attendance records and settings? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete All", 
          style: "destructive", 
          onPress: async () => {
            await storage.clearAll();
            loadData();
            Alert.alert("Success", "All data has been cleared.");
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarTextLarge}>{profile.name ? profile.name[0].toUpperCase() : 'S'}</Text>
          </View>
          
          {isEditingProfile ? (
            <View style={styles.editProfileForm}>
              <TextInput
                style={styles.input}
                value={editProfileData.name}
                onChangeText={t => setEditProfileData(prev => ({...prev, name: t}))}
                placeholder="Full Name"
              />
              <TextInput
                style={styles.input}
                value={editProfileData.roll}
                onChangeText={t => setEditProfileData(prev => ({...prev, roll: t}))}
                placeholder="Roll Number (e.g. 21BCE1234)"
                autoCapitalize="characters"
              />
              <TextInput
                style={styles.input}
                value={editProfileData.section}
                onChangeText={t => setEditProfileData(prev => ({...prev, section: t}))}
                placeholder="Section (e.g. 5A)"
                autoCapitalize="characters"
              />
              <View style={styles.editActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditingProfile(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile.name || 'Student'}</Text>
              <Text style={styles.profileSub}>
                {profile.roll || 'No Roll Number'}{profile.section ? ` · Sec ${profile.section}` : ''}
              </Text>
              <TouchableOpacity style={styles.editIconBtn} onPress={() => setIsEditingProfile(true)}>
                <MaterialIcons name="edit" size={20} color={theme.colors.primary} />
                <Text style={styles.editIconText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Linways Sync Integration */}
        <Text style={styles.sectionTitle}>Integrations</Text>
        <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/settings-modals/linways-sync')}>
          <View style={[styles.iconBox, { backgroundColor: theme.colors.primaryContainer }]}>
            <MaterialIcons name="sync" size={24} color={theme.colors.onPrimaryContainer} />
          </View>
          <View style={styles.settingText}>
            <Text style={styles.settingTitle}>Linways Auto-Sync</Text>
            <Text style={styles.settingDesc}>Connect to your university portal</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Timetable & Data</Text>
        <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/settings-modals/manage-classes')}>
          <View style={styles.iconBox}>
            <MaterialIcons name="class" size={24} color={theme.colors.primary} />
          </View>
          <View style={styles.settingText}>
            <Text style={styles.settingTitle}>Manage Classes</Text>
            <Text style={styles.settingDesc}>Add or remove subjects and schedule</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
        </TouchableOpacity>


        {/* Start Date */}
        <Text style={styles.sectionTitle}>Term Settings</Text>
        <TouchableOpacity style={[styles.settingRow, { paddingVertical: 12 }]} onPress={() => { setEditDateData(startDate); setIsEditingDate(true); }}>
          <View style={styles.iconBox}>
            <MaterialIcons name="date-range" size={24} color={theme.colors.primary} />
          </View>
          <View style={styles.settingText}>
            <Text style={styles.settingTitle}>Term Start Date</Text>
            <Text style={styles.settingDesc}>Used to calculate total base classes</Text>
          </View>
          {isEditingDate ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextInput 
                style={{ backgroundColor: theme.colors.surfaceContainerHigh, padding: 8, borderRadius: 8, marginRight: 8, color: theme.colors.onSurface }}
                value={editDateData}
                onChangeText={setEditDateData}
                placeholder="YYYY-MM-DD"
              />
              <TouchableOpacity onPress={handleSaveDate}>
                <MaterialIcons name="check" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.dateBadge}>
              <Text style={styles.dateBadgeText}>{startDate || 'Not Set'}</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>App Preferences</Text>
        
        {/* Dark Mode Toggle */}
        <View style={styles.settingRow}>
          <View style={styles.iconBox}>
            <MaterialIcons name={isDark ? "dark-mode" : "light-mode"} size={24} color={theme.colors.primary} />
          </View>
          <View style={styles.settingText}>
            <Text style={styles.settingTitle}>Dark Mode</Text>
            <Text style={styles.settingDesc}>Switch to dark theme</Text>
          </View>
          <Switch 
            value={isDark}
            onValueChange={handleToggleTheme}
            trackColor={{ true: theme.colors.primary }}
          />
        </View>

        {/* Notifications (Mocked for UI) */}
        <View style={styles.settingRow}>
          <View style={styles.iconBox}>
            <MaterialIcons name="notifications-active" size={24} color={theme.colors.primary} />
          </View>
          <View style={styles.settingText}>
            <Text style={styles.settingTitle}>Class Reminders</Text>
            <Text style={styles.settingDesc}>Notified 10 min before each class</Text>
          </View>
          <Switch 
            value={notifPrefs.classReminders}
            onValueChange={async (v) => {
              const updated = { ...notifPrefs, classReminders: v, reminderMinutes: 10 };
              setNotifPrefs(updated);
              await storage.saveNotificationPrefs(updated);
              const granted = await notificationService.requestPermissions();
              if (granted && v) {
                await notificationService.scheduleClassReminders();
              } else {
                await notificationService.cancelAll();
              }
            }}
            trackColor={{ true: theme.colors.primary }}
          />
        </View>
        {/* About / Legal */}
        <Text style={styles.sectionTitle}>About</Text>
        <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/settings-modals/privacy-policy')}>
          <View style={styles.iconBox}>
            <MaterialIcons name="privacy-tip" size={24} color={theme.colors.primary} />
          </View>
          <View style={styles.settingText}>
            <Text style={styles.settingTitle}>Privacy Policy</Text>
            <Text style={styles.settingDesc}>How we handle your data</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
        </TouchableOpacity>

        {/* Danger Zone */}
        <Text style={[styles.sectionTitle, { color: theme.colors.error, marginTop: 40 }]}>Danger Zone</Text>
        <TouchableOpacity style={styles.dangerBtn} onPress={clearAllData}>
          <MaterialIcons name="delete-forever" size={24} color={theme.colors.error} />
          <Text style={styles.dangerBtnText}>Clear All App Data</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.version}>AttendMe v1.0.0</Text>
          <Text style={styles.madeWith}>Made for tired students</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { padding: 24, paddingTop: 56, paddingBottom: 60 },
  profileCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  avatarLarge: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: theme.colors.primaryContainer,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  avatarTextLarge: { fontSize: 32, fontWeight: '700', color: theme.colors.onPrimaryContainer },
  profileInfo: { alignItems: 'center' },
  profileName: { fontSize: 24, fontWeight: '700', color: theme.colors.onSurface, marginBottom: 4 },
  profileSub: { fontSize: 14, color: theme.colors.onSurfaceVariant, marginBottom: 16 },
  editIconBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.surfaceContainer, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  editIconText: { fontSize: 14, fontWeight: '600', color: theme.colors.primary },
  editProfileForm: { width: '100%', gap: 12 },
  input: { backgroundColor: theme.colors.surfaceContainer, borderRadius: 12, padding: 12, fontSize: 16, color: theme.colors.onSurface },
  editActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: theme.colors.surfaceContainerHigh },
  cancelBtnText: { color: theme.colors.onSurface, fontWeight: '600', fontSize: 15 },
  saveBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: theme.colors.primary },
  saveBtnText: { color: theme.colors.onPrimary, fontWeight: '600', fontSize: 15 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 24, marginBottom: 16, marginLeft: 4 },
  settingRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surfaceContainerLowest, padding: 16, borderRadius: 16, marginBottom: 8 },
  iconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.colors.surfaceContainer, justifyContent: 'center', alignItems: 'center' },
  settingText: { flex: 1, marginLeft: 16, marginRight: 12 },
  settingTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.onSurface, marginBottom: 2 },
  settingDesc: { fontSize: 13, color: theme.colors.onSurfaceVariant },
  dateBadge: { backgroundColor: theme.colors.secondaryContainer, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  dateBadgeText: { color: theme.colors.onSecondaryContainer, fontSize: 13, fontWeight: '600' },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.errorContainer, padding: 16, borderRadius: 16, marginTop: 16 },
  dangerBtnText: { color: theme.colors.error, fontSize: 16, fontWeight: '600' },
  footer: { alignItems: 'center', marginTop: 48 },
  version: { fontSize: 14, fontWeight: '600', color: theme.colors.outline },
  madeWith: { fontSize: 12, color: theme.colors.outline, marginTop: 4 },
});
