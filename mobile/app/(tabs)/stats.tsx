import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Modal } from 'react-native';
import { Text } from '@/components/Text';
import Svg, { Circle } from 'react-native-svg';
import { MaterialIcons } from '@expo/vector-icons';
import { storage } from '../../services/storage';
import { useThemeContext } from '../../context/ThemeContext';
import SubjectDetail from '../../components/SubjectDetail';
import { useFocusEffect } from 'expo-router';

export default function StatsView() {
  const { theme, isDark, toggleTheme } = useThemeContext();
  const styles = makeStyles(theme);

  const [stats, setStats] = useState<any[]>([]);
  const [overall, setOverall] = useState({ attended: 0, total: 0, percentage: 0 });
  const [threshold, setThreshold] = useState(75);
  const [selectedStat, setSelectedStat] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const prefs = await storage.getNotificationPrefs();
    setThreshold(prefs.attendanceThreshold || 75);
    await calculateStats(prefs);
  };

  const calculateStats = async (prefs: any) => {
    const timetable = await storage.getTimetable();
    const records = await storage.getRecords();
    const baseCounts = await storage.getBaseCounts();

    const subjects = [...new Set(timetable.map((t: any) => t.subject))];
    let totalAttended = 0;
    let totalClasses = 0;
    const statsArray: any[] = [];

    subjects.forEach((sub: any) => {
      const weeklyCount = timetable.filter((t: any) => t.subject === sub).length;
      const subRecords = records.filter((r: any) => r.subject === sub && r.status !== 'unmarked');
      const presentRecs = subRecords.filter((r: any) => r.status === 'present').length;
      const totalRecs = subRecords.length;
      const baseTotal = baseCounts[sub] ? baseCounts[sub].total : 0;
      const baseAttended = baseCounts[sub] ? baseCounts[sub].attended : 0;
      const overallSubAttended = presentRecs + baseAttended;
      const overallSubTotal = totalRecs + baseTotal;
      
      totalAttended += overallSubAttended;
      totalClasses += overallSubTotal;

      let percentage = 0;
      let buffer = 0;
      let needed = 0;

      if (overallSubTotal > 0) {
        percentage = Math.round((overallSubAttended / overallSubTotal) * 100);
        if (percentage >= 75) {
          buffer = Math.floor((overallSubAttended / 0.75) - overallSubTotal);
        } else {
          needed = Math.ceil(3 * overallSubTotal - 4 * overallSubAttended);
        }
      }

      statsArray.push({
        subject: sub,
        subjectName: timetable.find((t: any) => t.subject === sub)?.subjectName || sub,
        weeklyCount,
        attended: overallSubAttended,
        total: overallSubTotal,
        percentage,
        buffer,
        needed
      });
    });

    statsArray.sort((a, b) => a.percentage - b.percentage);
    setStats(statsArray);
    const overallPct = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0;
    setOverall({ attended: totalAttended, total: totalClasses, percentage: overallPct });
  };

  const getStatusColor = (pct: number) => {
    if (pct >= threshold) return '#1a6627'; // dark green like web app
    if (pct >= threshold - 10) return '#b45309';
    return theme.colors.error;
  };

  const RADIUS = 56;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const dashOffset = CIRCUMFERENCE - (overall.percentage / 100) * CIRCUMFERENCE;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.pageTitle}>Statistics</Text>

        {/* Overall Status Card — matches web app exactly */}
        <View style={styles.overallCard}>
          {/* Left: Ring */}
          <View style={styles.ringWrapper}>
            <Svg width={130} height={130} viewBox="0 0 130 130">
              {/* Track */}
              <Circle
                cx="65" cy="65" r={RADIUS}
                fill="transparent"
                stroke={theme.colors.outlineVariant}
                strokeWidth="12"
                strokeLinecap="round"
              />
              {/* Fill */}
              <Circle
                cx="65" cy="65" r={RADIUS}
                fill="transparent"
                stroke={getStatusColor(overall.percentage)}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                originX="65"
                originY="65"
                rotation="-90"
              />
            </Svg>
            <View style={styles.ringCenter}>
              <Text style={[styles.ringPct, { color: getStatusColor(overall.percentage) }]}>
                {overall.percentage}%
              </Text>
              <Text style={styles.ringSub}>Overall</Text>
            </View>
          </View>

          {/* Right: ATTENDED / MISSED / TOTAL stacked with dividers */}
          <View style={styles.overallStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>ATTENDED</Text>
              <Text style={styles.statValue}>{overall.attended}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>MISSED</Text>
              <Text style={styles.statValue}>{overall.total - overall.attended}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>TOTAL</Text>
              <Text style={styles.statValue}>{overall.total}</Text>
            </View>
          </View>
        </View>

        {/* Subject Breakdown */}
        <View style={styles.subjectsSection}>
          <Text style={styles.sectionLabel}>Subject Breakdown</Text>
          
          {stats.map((stat, idx) => {
            const statusColor = getStatusColor(stat.percentage);
            return (
              <TouchableOpacity
                key={idx}
                style={styles.subjectCard}
                onPress={() => setSelectedStat(stat)}
              >
                <View style={styles.subjectRow}>
                  <View style={[styles.subjectDot, { backgroundColor: statusColor }]} />
                  <View style={styles.subjectInfo}>
                    <Text style={styles.subjectName}>{stat.subjectName || stat.subject}</Text>
                    <Text style={styles.subjectMeta}>
                      {stat.subject !== stat.subjectName ? stat.subject + ' · ' : ''}
                      {stat.attended}/{stat.total} classes · {stat.weeklyCount}/wk
                    </Text>
                  </View>
                  <View style={styles.subjectRight}>
                    <View style={[styles.pctBadge, { backgroundColor: statusColor + '1A' }]}>
                      <Text style={[styles.pctBadgeText, { color: statusColor }]}>{stat.percentage}%</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
                  </View>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.min(stat.percentage, 100)}%`, backgroundColor: statusColor }
                    ]}
                  />
                </View>
              </TouchableOpacity>
            );
          })}

          {stats.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialIcons name="bar-chart" size={48} color={theme.colors.outlineVariant} />
              <Text style={styles.emptyText}>No subjects yet.</Text>
              <Text style={styles.emptySub}>Sync with Linways or add your timetable from Settings.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Subject Detail Modal */}
      <Modal visible={!!selectedStat} animationType="slide" presentationStyle="pageSheet">
        {selectedStat && (
          <SubjectDetail 
            stat={selectedStat} 
            onClose={() => {
              setSelectedStat(null);
              loadData();
            }} 
          />
        )}
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 56,
    paddingBottom: 40,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.onBackground,
    marginBottom: 20,
  },

  // ── Overall card: horizontal layout matching the web app ──
  overallCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  ringWrapper: {
    width: 130,
    height: 130,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    flexShrink: 0,
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  ringPct: {
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 30,
    color: theme.colors.onSurface,
  },
  ringSub: {
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
    marginTop: 2,
  },
  overallStats: {
    flex: 1,
    flexDirection: 'column',
  },
  statItem: {
    paddingVertical: 10,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.onSurfaceVariant,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.onSurface,
    lineHeight: 32,
  },
  statDivider: {
    height: 1,
    backgroundColor: theme.colors.outlineVariant,
  },

  // ── Subject cards ──
  subjectsSection: {
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onBackground,
    marginBottom: 14,
  },
  subjectCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  subjectDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  subjectInfo: {
    flex: 1,
  },
  subjectName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 2,
  },
  subjectMeta: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  subjectRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pctBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pctBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressTrack: {
    height: 5,
    backgroundColor: theme.colors.surfaceContainer,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginTop: 16,
  },
  emptySub: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 8,
  },
});
