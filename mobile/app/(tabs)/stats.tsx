import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text } from '@/components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { storage } from '../../services/storage';
import { useFocusEffect } from 'expo-router';
import { useThemeContext } from '../../context/ThemeContext';
import SubjectDetail from '../../components/SubjectDetail';
import { AnimatedFadeIn } from '../../components/AnimatedFadeIn';

export default function AnalyticsView() {
  const { theme } = useThemeContext();
  const styles = makeStyles(theme);
  
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, percentage: 0 });
  const [subjectStats, setSubjectStats] = useState<any[]>([]);
  const [timeFilter, setTimeFilter] = useState('This Year');
  const [selectedStat, setSelectedStat] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [timeFilter])
  );

  const loadStats = async () => {
    const timetable = await storage.getTimetable() || [];
    const allRecords = await storage.getRecords() || [];
    const baseCounts = await storage.getBaseCounts() || {};

    const now = new Date();
    let records = allRecords;

    if (timeFilter === 'This Month') {
      records = allRecords.filter((r: any) => {
        const d = new Date(r.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
    } else if (timeFilter === 'Last Month') {
      const lastMonth = new Date();
      lastMonth.setMonth(now.getMonth() - 1);
      records = allRecords.filter((r: any) => {
        const d = new Date(r.date);
        return d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear();
      });
    } else if (timeFilter === 'This Year') {
      records = allRecords.filter((r: any) => {
        const d = new Date(r.date);
        return d.getFullYear() === now.getFullYear();
      });
    }

    let subjects = [...new Set(timetable.map((t: any) => t.subject))].filter(Boolean);
    const recordSubjects = [...new Set(allRecords.map((r: any) => r.subject))].filter(Boolean);
    
    recordSubjects.forEach(rs => {
      if (!subjects.includes(rs)) {
        subjects.push(rs);
      }
    });
    
    // 1. Calculate Subject Breakdown (ALWAYS ALL-TIME)
    const statsArray: any[] = [];
    subjects.forEach((sub: any) => {
      const subRecords = allRecords.filter((r: any) => r.subject === sub && r.status !== 'unmarked');
      const presentRecs = subRecords.filter((r: any) => r.status === 'present').length;
      const totalRecs = subRecords.length;
      const baseTotal = baseCounts[sub] ? baseCounts[sub].total : 0;
      const baseAttended = baseCounts[sub] ? baseCounts[sub].attended : 0;
      
      const overallSubAttended = presentRecs + baseAttended;
      const overallSubTotal = totalRecs + baseTotal;
      
      let buffer = 0;
      let needed = 0;
      let percentage = 0;
      if (overallSubTotal > 0) {
        percentage = Math.round((overallSubAttended / overallSubTotal) * 100);
        if (percentage >= 75) buffer = Math.floor((overallSubAttended / 0.75) - overallSubTotal);
        else needed = Math.ceil(3 * overallSubTotal - 4 * overallSubAttended);
      }
      
      statsArray.push({
        subject: sub,
        name: timetable.find((t: any) => t.subject === sub)?.subjectName || sub,
        attended: overallSubAttended,
        total: overallSubTotal,
        percentage,
        buffer,
        needed
      });
    });

    statsArray.sort((a, b) => a.percentage - b.percentage);
    setSubjectStats(statsArray);

    // 2. Calculate Top Summary Stats (AFFECTED BY TIME FILTER)
    let totalAttended = 0;
    let totalClasses = 0;
    
    subjects.forEach((sub: any) => {
      const subRecords = records.filter((r: any) => r.subject === sub && r.status !== 'unmarked');
      const presentRecs = subRecords.filter((r: any) => r.status === 'present').length;
      const totalRecs = subRecords.length;
      
      const includeBase = timeFilter === 'This Year' || timeFilter === 'All Time';
      const baseTotal = includeBase && baseCounts[sub] ? baseCounts[sub].total : 0;
      const baseAttended = includeBase && baseCounts[sub] ? baseCounts[sub].attended : 0;
      
      totalAttended += presentRecs + baseAttended;
      totalClasses += totalRecs + baseTotal;
    });

    const percentage = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0;
    setStats({ 
      total: totalClasses, 
      present: totalAttended, 
      absent: totalClasses - totalAttended, 
      percentage 
    });
  };

  const FilterPill = ({ label }: { label: string }) => {
    const isActive = timeFilter === label;
    return (
      <TouchableOpacity 
        style={[styles.filterPill, isActive && { backgroundColor: theme.colors.primary, borderWidth: 0 }]}
        onPress={() => setTimeFilter(label)}
      >
        <Text style={[styles.filterPillText, isActive && { color: 'white' }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <>
      <AnimatedFadeIn delay={0}>
        <Text style={styles.pageTitle}>Analytics</Text>
      </AnimatedFadeIn>

      <AnimatedFadeIn delay={50}>
        <View style={styles.filterRow}>
          <FilterPill label="This Year" />
          <FilterPill label="This Month" />
          <FilterPill label="Last Month" />
          <FilterPill label="All Time" />
        </View>
      </AnimatedFadeIn>

      <AnimatedFadeIn delay={100}>
        <View style={styles.cardsGrid}>
          {/* Total Classes */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>Total Classes</Text>
              <MaterialIcons name="calendar-today" size={16} color={theme.colors.primary} />
            </View>
            <Text style={[styles.cardValue, { color: theme.colors.onSurface }]}>{stats.total}</Text>
            <View style={[styles.chip, { backgroundColor: 'rgba(5, 150, 105, 0.15)' }]}>
              <MaterialIcons name="trending-up" size={12} color="#059669" />
              <Text style={[styles.chipText, { color: '#059669' }]}>{timeFilter}</Text>
            </View>
          </View>

          {/* Present */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>Present</Text>
              <MaterialIcons name="check-circle" size={16} color="#059669" />
            </View>
            <Text style={[styles.cardValue, { color: '#059669' }]}>{stats.present}</Text>
            <View style={[styles.chip, { backgroundColor: 'rgba(5, 150, 105, 0.15)' }]}>
              <MaterialIcons name="trending-up" size={12} color="#059669" />
              <Text style={[styles.chipText, { color: '#059669' }]}>Classes attended</Text>
            </View>
          </View>

          {/* Absent */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>Absent</Text>
              <MaterialIcons name="cancel" size={16} color="#dc2626" />
            </View>
            <Text style={[styles.cardValue, { color: '#dc2626' }]}>{stats.absent}</Text>
            <View style={[styles.chip, { backgroundColor: 'rgba(220, 38, 38, 0.15)' }]}>
              <MaterialIcons name="trending-down" size={12} color="#dc2626" />
              <Text style={[styles.chipText, { color: '#dc2626' }]}>Classes missed</Text>
            </View>
          </View>

          {/* Att. Score */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>Att. Score</Text>
              <MaterialIcons name="timeline" size={16} color="#2563eb" />
            </View>
            <Text style={[styles.cardValue, { color: stats.percentage >= 75 ? '#059669' : '#dc2626' }]}>{stats.percentage}%</Text>
            <View style={[styles.chip, { backgroundColor: stats.percentage >= 75 ? 'rgba(5, 150, 105, 0.15)' : 'rgba(220, 38, 38, 0.15)' }]}>
              <MaterialIcons name={stats.percentage >= 75 ? "trending-up" : "trending-down"} size={12} color={stats.percentage >= 75 ? '#059669' : '#dc2626'} />
              <Text style={[styles.chipText, { color: stats.percentage >= 75 ? '#059669' : '#dc2626' }]}>{stats.percentage >= 75 ? 'On Track' : 'At Risk'}</Text>
            </View>
          </View>
        </View>
      </AnimatedFadeIn>

      <AnimatedFadeIn delay={150}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Subject Breakdown</Text>
        </View>
      </AnimatedFadeIn>
    </>
  );

  const renderSubject = ({ item: sub, index }: { item: any, index: number }) => (
    <AnimatedFadeIn delay={150 + (index * 40)}>
      <TouchableOpacity onPress={() => setSelectedStat(sub)} style={styles.subjectCard}>
        <View style={styles.subjectRow}>
          <View style={[styles.subjectDot, { backgroundColor: sub.percentage >= 75 ? theme.colors.secondary : theme.colors.error }]} />
          <View style={styles.subjectInfo}>
            <Text style={styles.subjectName}>{sub.name}</Text>
            <Text style={styles.subjectMeta}>{sub.attended}/{sub.total} classes</Text>
          </View>
          <View style={{ alignItems: 'flex-end', flexDirection: 'row', gap: 4 }}>
            <Text style={styles.subjectPct}>{sub.percentage}%</Text>
            <MaterialIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
          </View>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { 
            width: `${Math.min(sub.percentage, 100)}%`,
            backgroundColor: sub.percentage >= 75 ? theme.colors.secondary : theme.colors.error
          }]} />
        </View>
      </TouchableOpacity>
    </AnimatedFadeIn>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={subjectStats}
        keyExtractor={(item) => item.subject}
        ListHeaderComponent={renderHeader()}
        renderItem={renderSubject}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <AnimatedFadeIn delay={150}>
            <View style={styles.subjectCard}>
              <Text style={styles.emptyText}>No subject data available.</Text>
            </View>
          </AnimatedFadeIn>
        }
      />

      <Modal visible={!!selectedStat} animationType="slide" onRequestClose={() => setSelectedStat(null)}>
        {selectedStat && <SubjectDetail stat={selectedStat} onClose={() => setSelectedStat(null)} />}
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { padding: 24, paddingBottom: 100 },
  pageTitle: { fontSize: 24, fontWeight: '700', color: theme.colors.onSurface, marginBottom: 20, fontFamily: 'Manrope-Bold' },
  
  filterRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 24, borderWidth: 1, borderColor: theme.colors.outlineVariant, backgroundColor: theme.colors.surface },
  filterPillText: { fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.onSurface },

  cardsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 32 },
  card: { width: '47%', backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.colors.outlineVariant },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardLabel: { color: theme.colors.onSurfaceVariant, fontSize: 13, fontFamily: 'Manrope-Medium' },
  cardValue: { fontSize: 28, fontFamily: 'Manrope-Bold', marginBottom: 16 },
  
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  chipText: { fontSize: 11, fontFamily: 'Manrope-SemiBold' },

  sectionHeader: { marginBottom: 16 },
  sectionTitle: { color: theme.colors.onSurface, fontSize: 16, fontWeight: '600', fontFamily: 'Manrope-SemiBold' },

  emptyText: { textAlign: 'center', color: theme.colors.onSurfaceVariant, fontFamily: 'Manrope-Medium', fontSize: 13, paddingVertical: 12 },

  subjectsSection: { marginTop: 4 },
  subjectCard: { backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: theme.colors.outlineVariant },
  subjectRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  subjectDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  subjectInfo: { flex: 1 },
  subjectName: { fontSize: 15, fontWeight: '600', color: theme.colors.onSurface, fontFamily: 'Manrope-SemiBold' },
  subjectMeta: { fontSize: 13, color: theme.colors.onSurfaceVariant, fontFamily: 'Manrope-Regular', marginTop: 2 },
  subjectPct: { fontSize: 15, fontWeight: '700', color: theme.colors.onSurface, fontFamily: 'Manrope-Bold' },
  progressBarBg: { height: 6, backgroundColor: theme.colors.surfaceContainerHigh, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
});
