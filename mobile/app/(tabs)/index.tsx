import React, { useState, useEffect, useCallback } from 'react';
import { haptics } from '../../utils/haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, StyleSheet, TouchableOpacity, FlatList, Dimensions, ToastAndroid } from 'react-native';
import { Text } from '@/components/Text';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from '@/components/LinearGradient';
import { useRouter, useFocusEffect } from 'expo-router';

import { storage } from '../../services/storage';
import { timetableService } from '../../services/timetable';
import { linwaysSync } from '../../services/linwaysSync';
import { dateUtils } from '../../utils/dateUtils';
import { useThemeContext } from '../../context/ThemeContext';
import { notificationService } from '../../services/notifications';
import { refreshWidget } from '../../utils/widgetRefresh';
import { AnimatedFadeIn } from '../../components/AnimatedFadeIn';

const { width } = Dimensions.get('window');

let hasSyncedThisSession = false;

export default function HomeView() {
  const { theme, isDark } = useThemeContext();
  const styles = makeStyles(theme);
  const router = useRouter();

  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<any>({ name: 'Student' });
  const [overall, setOverall] = useState({ attended: 0, total: 0, bunksLeft: 0, percentage: 0 });
  const [nextClass, setNextClass] = useState<any>(null);
  const [recentRecords, setRecentRecords] = useState<any[]>([]);

  // Check on first mount only if Linways is configured
  useEffect(() => {
    linwaysSync.isConfigured().then(configured => {
      setIsConfigured(configured);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {

    const cfg = await linwaysSync.getConfig();
    if (cfg && cfg.autoSync !== false && !hasSyncedThisSession) {
      hasSyncedThisSession = true;
      linwaysSync.sync().then(async () => {
        const p = await storage.getProfile() || { name: 'Student' };
        setProfile(p);
        await computeStats();
        await findNextClass();
      }).catch(() => {
        ToastAndroid.show('Linways sync failed', ToastAndroid.SHORT);
        hasSyncedThisSession = false;
      });
    }

    const p = await storage.getProfile() || { name: 'Student' };
    setProfile(p);
    await computeStats();
    await findNextClass();
    await loadRecentAttendance();
  };

  const loadRecentAttendance = async () => {
    const records = await storage.getRecords();
    const timetable = await storage.getTimetable();
    
    // Group by date
    const byDate: Record<string, any[]> = {};
    records.filter((r: any) => r.status !== 'unmarked').forEach((r: any) => {
      if (!byDate[r.date]) byDate[r.date] = [];
      const tt = timetable.find((t: any) => t.subject === r.subject);
      byDate[r.date].push({ ...r, subjectName: tt?.subjectName || r.subject });
    });

    const sortedDates = Object.keys(byDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).slice(0, 3);
    
    const grouped = sortedDates.map(dateStr => {
      const dayRecs = byDate[dateStr];
      
      // Calculate Check-in (first start time) and Check-out (last end time)
      const times = dayRecs.map(r => r.starttime).filter(Boolean).sort();
      const endTimes = dayRecs.map(r => r.endtime).filter(Boolean).sort();
      
      const checkIn = times.length > 0 ? times[0] : '-';
      const checkOut = endTimes.length > 0 ? endTimes[endTimes.length - 1] : '-';
      
      // Count present classes
      const attended = dayRecs.filter(r => r.status === 'present').length;
      
      return {
        date: dateStr,
        attended,
        total: dayRecs.length,
        checkIn,
        checkOut,
        records: dayRecs
      };
    });
    
    setRecentRecords(grouped);
  };

  const computeStats = async () => {
    const timetable = await storage.getTimetable();
    const records = await storage.getRecords();
    const baseCounts = await storage.getBaseCounts();
    
    let subjects = [...new Set(timetable.map((t: any) => t.subject))].filter(Boolean);
    const recordSubjects = [...new Set(records.map((r: any) => r.subject))].filter(Boolean);
    
    recordSubjects.forEach(rs => {
      if (!subjects.includes(rs)) {
        subjects.push(rs);
      }
    });

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
    if (status === 'present') haptics.success();
    else haptics.medium();

    const todayStr = dateUtils.formatDate(new Date());
    await storage.addRecord({ date: todayStr, subject: nextClass.subject, hour: nextClass.hour, status });
    notificationService.notifyAttendanceMarked(
      nextClass.subjectName || nextClass.subject,
      status as 'present' | 'absent',
      todayStr,
    );
    refreshWidget();
    await computeStats();
    await findNextClass();
    await loadRecentAttendance();
  };

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 17) return 'Good afternoon';
    return 'Good evening';
  };
  const firstName = profile.name ? profile.name.split(' ')[0] : 'Student';
  const getTodayLabel = () => new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });

  const renderHeader = () => (
    <>
      <AnimatedFadeIn delay={0}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.username}>{profile.name || 'Student'}</Text>
          </View>
          <TouchableOpacity style={styles.iconButton}>
            <MaterialIcons name="notifications-none" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
        </View>
        <Text style={styles.dateText}>{getTodayLabel()}</Text>
      </AnimatedFadeIn>

      <AnimatedFadeIn delay={50}>
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroSection}
        >
          <View style={styles.heroContent}>
            <Text style={styles.heroLabel}>Up Next</Text>
            {nextClass ? (
              <View style={styles.heroClassInfo}>
                <Text style={styles.heroClassName}>{nextClass.subjectName || nextClass.subject}</Text>
                <Text style={styles.heroClassMeta}>{nextClass.starttime} - {nextClass.endtime} • Room {nextClass.room}</Text>
              </View>
            ) : (
              <View style={styles.heroClassInfo}>
                <Text style={styles.heroClassName}>No more classes</Text>
                <Text style={styles.heroClassMeta}>You're all set for today!</Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </AnimatedFadeIn>

      <AnimatedFadeIn delay={100}>
        <View style={styles.cardsGrid}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="event-available" size={16} color={theme.colors.primary} />
              <Text style={styles.cardLabel}>Bunks Left</Text>
            </View>
            <Text style={styles.cardValue}>{overall.bunksLeft}</Text>
            <Text style={styles.cardSub}>Remaining</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="check-circle" size={16} color={theme.colors.secondary} />
              <Text style={styles.cardLabel}>Attended</Text>
            </View>
            <Text style={styles.cardValue}>{overall.attended}</Text>
            <Text style={styles.cardSub}>Classes</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="cancel" size={16} color={theme.colors.error} />
              <Text style={styles.cardLabel}>Missed</Text>
            </View>
            <Text style={styles.cardValue}>{overall.total - overall.attended}</Text>
            <Text style={styles.cardSub}>Classes</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="insights" size={16} color={theme.colors.primary} />
              <Text style={styles.cardLabel}>Overall</Text>
            </View>
            <Text style={styles.cardValue}>{overall.percentage}%</Text>
            <Text style={styles.cardSub}>Score</Text>
          </View>
        </View>
      </AnimatedFadeIn>

      <AnimatedFadeIn delay={150}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Attendance</Text>
          <TouchableOpacity onPress={() => router.push('/calendar')}>
            <Text style={styles.seeMoreBtn}>See all</Text>
          </TouchableOpacity>
        </View>
      </AnimatedFadeIn>
    </>
  );

  const renderRecentRecord = ({ item, index }: { item: any, index: number }) => (
    <AnimatedFadeIn delay={150 + (index * 40)}>
      <View style={styles.historyCardContainer}>
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDark]}
          style={styles.historyCardGradient}
        >
          {/* Left Date Block */}
          <View style={styles.historyLeftBox}>
            <Text style={styles.historyDateNum}>{new Date(item.date).getDate()}</Text>
            <Text style={styles.historyDateDay}>{new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' })}</Text>
          </View>
          
          {/* Right Content - Summary */}
          <View style={styles.historyRightContent}>
            <Text style={styles.historySubjectName}>{item.attended}/{item.total} Classes Attended</Text>
            <Text style={styles.historyMoreText}>8:50 AM to 4:15 PM</Text>
          </View>
        </LinearGradient>
      </View>
    </AnimatedFadeIn>
  );

  // Still loading config — show nothing to prevent a flash
  if (isConfigured === null) return null;

  // Not configured — show a setup prompt; navigate only on explicit button tap
  if (isConfigured === false) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
        <MaterialIcons name="sync-lock" size={64} color={theme.colors.primary} />
        <Text style={{ fontSize: 22, fontFamily: 'Manrope-Bold', color: theme.colors.onSurface, marginTop: 24, textAlign: 'center' }}>
          Setup Required
        </Text>
        <Text style={{ fontSize: 15, color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 12, lineHeight: 22 }}>
          Connect your Linways account to start tracking attendance automatically.
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/settings-modals/linways-sync')}
          style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, marginTop: 32 }}
        >
          <Text style={{ color: theme.colors.onPrimary, fontFamily: 'Manrope-SemiBold', fontSize: 16 }}>Connect Linways</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={recentRecords}
        keyExtractor={(item, index) => item.date || index.toString()}
        ListHeaderComponent={renderHeader()}
        renderItem={renderRecentRecord}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <AnimatedFadeIn delay={150}>
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyText}>No recent attendance records</Text>
            </View>
          </AnimatedFadeIn>
        }
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />
    </SafeAreaView>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { padding: 24, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  greeting: { color: theme.colors.onSurfaceVariant, fontSize: 14, fontFamily: 'Manrope-Regular' },
  username: { color: theme.colors.onSurface, fontSize: 20, fontWeight: '600', marginTop: 4, fontFamily: 'Manrope-Bold' },
  dateText: { fontSize: 12, color: theme.colors.onSurfaceVariant, marginBottom: 24, fontFamily: 'Manrope-Regular' },
  iconButton: { padding: 8, backgroundColor: 'transparent', borderRadius: 8 },
  heroSection: { borderRadius: 24, padding: 24, marginBottom: 24, elevation: 4, shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  heroContent: { alignItems: 'center' },
  heroLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 4, fontFamily: 'Manrope-Medium' },
  heroClassInfo: { alignItems: 'center', marginBottom: 24 },
  heroClassName: { color: 'white', fontSize: 28, fontWeight: '600', textAlign: 'center', fontFamily: 'Manrope-Bold' },
  heroClassMeta: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginTop: 4, fontFamily: 'Manrope-Regular' },
  heroBtnTextOutline: { color: 'white', fontWeight: '600', fontFamily: 'Manrope-SemiBold' },
  cardsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 24 },
  card: { width: '47%', backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.colors.outlineVariant },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cardLabel: { color: theme.colors.onSurfaceVariant, fontSize: 14, fontFamily: 'Manrope-Medium' },
  cardValue: { color: theme.colors.onSurface, fontSize: 24, fontWeight: '600', marginBottom: 4, fontFamily: 'Manrope-Bold' },
  cardSub: { color: theme.colors.onSurfaceVariant, fontSize: 12, fontFamily: 'Manrope-Regular' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { color: theme.colors.onSurface, fontSize: 16, fontWeight: '600', fontFamily: 'Manrope-SemiBold' },
  seeMoreBtn: { color: theme.colors.primary, fontSize: 14, fontFamily: 'Manrope-Medium' },
  historyCards: { gap: 12 },
  historyCardContainer: { borderRadius: 16, overflow: 'hidden' },
  historyCardGradient: { flexDirection: 'row', padding: 16, alignItems: 'center' },
  historyLeftBox: { width: 60, height: 60, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  historyDateNum: { fontSize: 22, fontFamily: 'Manrope-Bold', color: 'white', marginBottom: -4 },
  historyDateDay: { fontSize: 11, fontFamily: 'Manrope-Medium', color: 'rgba(255,255,255,0.8)' },
  historyRightContent: { flex: 1, justifyContent: 'center', paddingTop: 6 },
  historySubjectRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  historySubjectName: { flex: 1, fontSize: 14, fontFamily: 'Manrope-Medium', color: 'white', marginRight: 12 },
  historyStatusDot: { width: 8, height: 8, borderRadius: 4 },
  historyMoreText: { fontSize: 11, fontFamily: 'Manrope-Regular', color: 'rgba(255,255,255,0.6)', marginTop: -2 },
  emptyHistory: { alignItems: 'center', padding: 24, backgroundColor: theme.colors.surfaceContainerLowest, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.outlineVariant },
  emptyText: { color: theme.colors.onSurfaceVariant, fontFamily: 'Manrope-Regular' }
});
