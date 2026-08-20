import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { Text } from '@/components/Text';
import { MaterialIcons } from '@expo/vector-icons';
import { storage } from '../services/storage';
import { useThemeContext } from '../context/ThemeContext';

export default function SubjectDetail({ stat, onClose }: { stat: any, onClose: () => void }) {
  const { theme, isDark, toggleTheme } = useThemeContext();
  const styles = makeStyles(theme);
  const [history, setHistory] = useState<any[]>([]);
  const [room, setRoom] = useState('');
  const [threshold, setThreshold] = useState(75);

  useEffect(() => {
    loadDetails();
  }, [stat.subject]);

  const loadDetails = async () => {
    const prefs = await storage.getNotificationPrefs();
    setThreshold(prefs.attendanceThreshold || 75);

    const timetable = await storage.getTimetable();
    const tt = timetable.find((t: any) => t.subject === stat.subject);
    if (tt && tt.room) {
      setRoom(tt.room);
    }

    const allRecords = await storage.getRecords();
    const subjectRecords = allRecords
      .filter((r: any) => r.subject === stat.subject && r.status !== 'unmarked')
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setHistory(subjectRecords);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return theme.colors.secondary;
      case 'absent': return theme.colors.error;
      case 'excused': return theme.colors.outline;
      default: return theme.colors.outlineVariant;
    }
  };

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onClose}>
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.appTitle}>AttendMe</Text>
        <View style={{ width: 48 }} /> 
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Subject Header */}
        <View style={styles.section}>
          <View style={styles.subjectIndicator} />
          <Text style={styles.subjectTitle}>
            {stat.subjectName && stat.subjectName !== stat.subject ? (
              <Text>
                <Text style={styles.subjectCode}>{stat.subject}{'\n'}</Text>
                {stat.subjectName}
              </Text>
            ) : (
              stat.subject
            )}
          </Text>
          <Text style={styles.subjectMeta}>{room ? `Room ${room}` : 'No room assigned'}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Attended</Text>
              <Text style={styles.statValue}>{stat.attended}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Missed</Text>
              <Text style={styles.statValue}>{stat.total - stat.attended}</Text>
            </View>
            <View style={[styles.statBox, { alignItems: 'flex-end' }]}>
              <Text style={styles.statLabel}>Total</Text>
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>{stat.percentage}%</Text>
            </View>
          </View>
        </View>

        {/* Insights Pill */}
        <View style={styles.section}>
          {stat.total > 0 && stat.percentage >= threshold && (
            <View style={[styles.insightPill, styles.insightInfo]}>
              <MaterialIcons name="trending-up" size={20} color={theme.colors.secondary} />
              <Text style={styles.insightText}>Can miss {stat.buffer} class{stat.buffer !== 1 ? 'es' : ''} safely</Text>
            </View>
          )}
          {stat.total > 0 && stat.percentage < threshold && (
            <View style={[styles.insightPill, styles.insightWarn]}>
              <MaterialIcons name="trending-up" size={20} color={theme.colors.error} />
              <Text style={styles.insightText}>Attend {stat.needed} class{stat.needed !== 1 ? 'es' : ''} to reach {threshold}%</Text>
            </View>
          )}
          {stat.total === 0 && (
            <View style={[styles.insightPill, styles.insightNeutral]}>
              <MaterialIcons name="info" size={20} color={theme.colors.outline} />
              <Text style={styles.insightText}>No records yet</Text>
            </View>
          )}
        </View>

        {/* History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent History</Text>
          <View style={styles.historyList}>
            {history.length > 0 ? (
              history.map((record, idx) => {
                const dateObj = new Date(record.date);
                const dayStr = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                return (
                  <View key={idx} style={styles.historyItem}>
                    <View style={styles.historyLeft}>
                      <Text style={styles.historyDate}>{dateStr}</Text>
                      <Text style={styles.historyMeta}>{dayStr} · Hour {record.hour}</Text>
                    </View>
                    <View style={styles.historyRight}>
                      <View style={[styles.statusDot, { backgroundColor: getStatusColor(record.status) }]} />
                      <Text style={styles.statusText}>{capitalize(record.status)}</Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={styles.emptyText}>No attendance history available.</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceContainer,
  },
  iconBtn: {
    padding: 12,
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  scrollContent: {
    padding: 24,
  },
  section: {
    marginBottom: 32,
  },
  subjectIndicator: {
    width: 48,
    height: 4,
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
    marginBottom: 16,
  },
  subjectTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.onSurface,
    lineHeight: 36,
  },
  subjectCode: {
    fontSize: 14,
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subjectMeta: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginTop: 8,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceContainerLowest,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statBox: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  insightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  insightInfo: {
    backgroundColor: theme.colors.secondaryContainer,
  },
  insightWarn: {
    backgroundColor: theme.colors.errorContainer,
  },
  insightNeutral: {
    backgroundColor: theme.colors.surfaceContainer,
  },
  insightText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.onSurface,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 16,
  },
  historyList: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: 16,
    overflow: 'hidden',
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceContainer,
  },
  historyLeft: {},
  historyDate: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  historyMeta: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
  },
  historyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.onSurface,
  },
  emptyText: {
    padding: 24,
    textAlign: 'center',
    color: theme.colors.onSurfaceVariant,
  }
});
