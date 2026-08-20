import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Dimensions, ToastAndroid } from 'react-native';
import { Text } from '@/components/Text';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useRouter, useFocusEffect } from 'expo-router';

import { storage } from '../../services/storage';
import { timetableService } from '../../services/timetable';
import { linwaysSync } from '../../services/linwaysSync';
import { dateUtils } from '../../utils/dateUtils';
import { useThemeContext } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

let hasSyncedThisSession = false;

export default function HomeView() {
  const { theme, isDark, toggleTheme } = useThemeContext();
  const styles = makeStyles(theme);

  const router = useRouter();
  const [profile, setProfile] = useState<any>({ name: 'Student', studentId: '', section: '', semester: '' });
  const [overall, setOverall] = useState({ attended: 0, total: 0, bunksLeft: 0, percentage: 0 });
  const [nextClass, setNextClass] = useState<any>(null);
  const [safetyMsg, setSafetyMsg] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const isConfigured = await linwaysSync.isConfigured();
    if (!isConfigured) {
      router.push('/settings-modals/linways-sync');
      return;
    }

    // Auto-sync silently in background only once per session
    const cfg = await linwaysSync.getConfig();
    if (cfg && cfg.autoSync !== false && !hasSyncedThisSession) {
      hasSyncedThisSession = true;
      linwaysSync.sync().then(async () => {
        // Refresh stats silently after sync
        const p = await storage.getProfile() || { name: 'Student' };
        setProfile(p);
        computeStats();
        findNextClass();
      }).catch(() => {
        ToastAndroid.show('Linways sync failed: No internet connection', ToastAndroid.SHORT);
        hasSyncedThisSession = false; // Reset if failed so it tries again later
      });
    }

    const p = await storage.getProfile() || { name: 'Student' };
    setProfile(p);
    await computeStats();
    await findNextClass();
  };

  const computeStats = async () => {
    const timetable = await storage.getTimetable();
    const records = await storage.getRecords();
    const baseCounts = await storage.getBaseCounts();
    const subjects = [...new Set(timetable.map((t: any) => t.subject))];

    let totalAttended = 0;
    let totalClasses = 0;

    subjects.forEach((sub: any) => {
      const subRecords = records.filter((r: any) => r.subject === sub && r.status !== 'unmarked');
      const presentRecs = subRecords.filter((r: any) => r.status === 'present').length;
      const totalRecs = subRecords.length;
      const baseTotal = baseCounts[sub] ? baseCounts[sub].total : 0;
      const baseAttended = baseCounts[sub] ? baseCounts[sub].attended : 0;
      totalAttended += (presentRecs + baseAttended);
      totalClasses += (totalRecs + baseTotal);
    });

    const percentage = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0;
    const bunksLeft = totalClasses > 0 ? Math.max(0, Math.floor((totalAttended / 0.75) - totalClasses)) : 0;

    setOverall({ attended: totalAttended, total: totalClasses, bunksLeft, percentage });

    if (percentage >= 90) setSafetyMsg("You're doing great! 🎉");
    else if (percentage >= 75) setSafetyMsg("You're safe this week");
    else setSafetyMsg("Attendance needs attention");
  };

  const findNextClass = async () => {
    const todayStr = dateUtils.formatDate(new Date());
    const todayClasses = await timetableService.getClassesForDate(todayStr);
    const records = (await storage.getRecords()).filter((r: any) => r.date === todayStr);
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const next = todayClasses.find((cls: any) => {
      if (!cls.starttime) return false;
      const [h, m] = cls.starttime.split(':').map(Number);
      const classMinutes = h * 60 + (m || 0);
      const rec = records.find((r: any) => r.hour === cls.hour && r.subject === cls.subject);
      return classMinutes >= currentMinutes - 30 && !rec;
    });
    setNextClass(next || null);
  };

  const markClass = async (status: string) => {
    if (!nextClass) return;
    const todayStr = dateUtils.formatDate(new Date());
    await storage.addRecord({ date: todayStr, subject: nextClass.subject, hour: nextClass.hour, status });
    // Note: Haptics can be added here using expo-haptics
    await computeStats();
    await findNextClass();
  };

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getTodayLabel = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const firstName = profile.name ? profile.name.split(' ')[0] : 'Student';
  const avatarInitial = firstName[0]?.toUpperCase() || 'S';

  const RADIUS = 65;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const maxBunks = Math.max(overall.bunksLeft, 10);
  const fraction = Math.min(overall.bunksLeft / maxBunks, 1);
  const dashOffset = CIRCUMFERENCE - fraction * CIRCUMFERENCE;

  const isSafe = overall.percentage >= 75;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.dateLabel}>{getTodayLabel()}</Text>
            <Text style={styles.greeting}>{getGreeting()}, {firstName}</Text>
            {profile.section || profile.studentId ? (
               <Text style={styles.profileSub}>
                 {profile.studentId}{profile.section ? ` · ${profile.section}` : ''}
               </Text>
            ) : null}
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarInitial}</Text>
          </View>
        </View>

        {/* Status Ring */}
        <View style={styles.ringSection}>
          <View style={styles.ringWrapper}>
            <Svg width="150" height="150" viewBox="0 0 150 150">
              <Circle
                cx="75" cy="75" r={RADIUS}
                fill="transparent"
                stroke={isSafe ? 'rgba(18,109,39,0.12)' : 'rgba(186,26,26,0.12)'}
                strokeWidth="10"
                strokeLinecap="round"
              />
              <Circle
                cx="75" cy="75" r={RADIUS}
                fill="transparent"
                stroke={isSafe ? theme.colors.secondaryContainer : theme.colors.errorContainer}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                originX="75"
                originY="75"
                rotation="-90"
              />
            </Svg>
            <View style={styles.ringCenter}>
              <Text style={styles.ringNumber}>{overall.bunksLeft}</Text>
              <Text style={styles.ringLabel}>bunks left</Text>
            </View>
          </View>
          <Text style={[styles.safetyMsg, { color: isSafe ? theme.colors.secondary : theme.colors.error }]}>
            {safetyMsg}
          </Text>
        </View>

        {/* Up Next */}
        <View style={styles.nextSection}>
          <Text style={styles.sectionLabel}>Up next</Text>
          {nextClass ? (
            <View style={styles.nextCard}>
              <View style={styles.nextDot} />
              <Text style={styles.nextSubject}>
                {nextClass.subjectName && nextClass.subjectName !== nextClass.subject ? (
                  <Text>
                    <Text style={styles.nextSubjectCode}>{nextClass.subject}{'\n'}</Text>
                    {nextClass.subjectName}
                  </Text>
                ) : (
                  nextClass.subject
                )}
              </Text>
              <Text style={styles.nextMeta}>
                {nextClass.starttime} – {nextClass.endtime}
                {nextClass.room ? ` · ${nextClass.room}` : ''}
              </Text>
            </View>
          ) : (
            <View style={[styles.nextCard, styles.nextEmpty]}>
              <MaterialIcons name="check-circle" size={32} color={theme.colors.secondary} style={{ marginBottom: 8 }} />
              <Text style={styles.emptyText}>No more classes today!</Text>
              <Text style={styles.emptySub}>Enjoy your day 🎉</Text>
            </View>
          )}
        </View>

        {/* Overall Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.statChip}>
            <Text style={styles.statLabel}>Attended</Text>
            <Text style={styles.statValue}>{overall.attended}</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statLabel}>Missed</Text>
            <Text style={styles.statValue}>{overall.total - overall.attended}</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statLabel}>Overall</Text>
            <Text style={styles.statValue}>{overall.percentage}%</Text>
          </View>
        </View>

        {/* Footer Link */}
        <TouchableOpacity style={styles.footerLink} onPress={() => router.push('/calendar')}>
          <Text style={styles.linkBtn}>View today's full schedule →</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 56,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.onSurfaceVariant,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  profileSub: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
    fontWeight: '500',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.onPrimaryContainer,
  },
  ringSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  ringWrapper: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  ringNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: theme.colors.onSurface,
    lineHeight: 56,
  },
  ringLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.onSurfaceVariant,
  },
  safetyMsg: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  nextSection: {
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 12,
  },
  nextCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  nextDot: {
    position: 'absolute',
    top: 24,
    left: 0,
    width: 4,
    height: 24,
    backgroundColor: theme.colors.primary,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  nextSubject: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 4,
  },
  nextSubjectCode: {
    fontSize: 12,
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nextMeta: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 20,
  },
  nextActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  btnMissed: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.errorContainer,
  },
  btnAttended: {
    backgroundColor: theme.colors.secondaryContainer,
    borderColor: 'transparent',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  nextHint: {
    textAlign: 'center',
    fontSize: 12,
    color: theme.colors.outline,
  },
  nextEmpty: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.surfaceContainer,
    borderStyle: 'dashed',
    elevation: 0,
    shadowOpacity: 0,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  emptySub: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statChip: {
    flex: 1,
    backgroundColor: theme.colors.surfaceContainerLow,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  footerLink: {
    alignItems: 'center',
    marginTop: 8,
  },
  linkBtn: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  }
});
