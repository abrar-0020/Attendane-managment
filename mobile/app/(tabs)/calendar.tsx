import React, { useState, useEffect, useCallback } from 'react';
import { haptics } from '../../utils/haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Text } from '@/components/Text';
import { useFocusEffect } from 'expo-router';
import { storage } from '../../services/storage';
import { dateUtils } from '../../utils/dateUtils';
import { timetableService } from '../../services/timetable';
import { MaterialIcons } from '@expo/vector-icons';
import ClassCard from '../../components/ClassCard';
import { AnimatedFadeIn } from '../../components/AnimatedFadeIn';
import { useThemeContext } from '../../context/ThemeContext';
import { notificationService } from '../../services/notifications';
import { refreshWidget } from '../../utils/widgetRefresh';
import { LinearGradient } from '@/components/LinearGradient';

export default function CalendarView() {
  const { theme, isDark } = useThemeContext();
  const styles = makeStyles(theme);

  const [selectedDate, setSelectedDate] = useState(dateUtils.formatDate(new Date()));
  const [classes, setClasses] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [holiday, setHoliday] = useState<any>(null);
  const [calendarDays, setCalendarDays] = useState<any[]>([]);
  const [allRecords, setAllRecords] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadDateData(selectedDate);
    }, [selectedDate])
  );

  const loadDateData = async (dateStr: string) => {
    const dayClasses = await timetableService.getClassesForDate(dateStr);
    const dayHoliday = await timetableService.getHolidayForDate(dateStr);
    const aRecords = await storage.getRecords();
    const fullTimetable = await storage.getTimetable() || [];
    const allHolidays = await storage.getHolidays() || [];
    
    setClasses(dayClasses);
    setHoliday(dayHoliday);
    setRecords(aRecords.filter((r: any) => r.date === dateStr));
    setAllRecords(aRecords);
    generateCalendar(dateStr, aRecords, fullTimetable, allHolidays);
  };

  const generateCalendar = (dateStr: string, records: any[], fullTimetable: any[] = [], allHolidays: any[] = []) => {
    const date = dateUtils.parseDate(dateStr);
    const month = date.getMonth();
    const year = date.getFullYear();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    const startPadding = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Mon=0, Sun=6
    
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      const currentDateStr = dateUtils.formatDate(d);
      
      const dayName = dateUtils.getDayName(d);
      const isHoliday = allHolidays.some(h => h.date === currentDateStr);
      const classesForDay = fullTimetable.filter(t => t.day === dayName);
      
      let status = 'none';
      
      // If there's a holiday, it's Sunday, or no classes are scheduled -> Red dot ('absent' color mapping)
      // Otherwise -> Green dot ('present' color mapping)
      if (isHoliday || dayName === 'Sunday' || classesForDay.length === 0) {
        status = 'absent';
      } else {
        status = 'present';
      }
      
      days.push({
        day: i,
        dateStr: currentDateStr,
        status
      });
    }
    setCalendarDays(days);
  };

  const handleUpdateStatus = async (subject: string, hour: string, status: string) => {
    haptics.light();
    await storage.addRecord({ date: selectedDate, subject, hour, status });
    notificationService.notifyAttendanceMarked(
      subject,
      status as 'present' | 'absent',
      selectedDate,
    );
    refreshWidget();
    loadDateData(selectedDate);
  };

  const navigateMonth = (direction: number) => {
    haptics.selection();
    const current = dateUtils.parseDate(selectedDate);
    current.setMonth(current.getMonth() + direction);
    setSelectedDate(dateUtils.formatDate(current));
  };

  const getMonthLabel = () => {
    const d = dateUtils.parseDate(selectedDate);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const isSunday = dateUtils.getDayName(dateUtils.parseDate(selectedDate)) === 'Sunday';

  const renderHeader = () => (
    <>
      <AnimatedFadeIn delay={0}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Attendance History</Text>
        </View>
      </AnimatedFadeIn>

      <AnimatedFadeIn delay={50}>
        <View style={styles.calendarCard}>
          <View style={styles.monthHeader}>
            <TouchableOpacity style={styles.navBtn} onPress={() => navigateMonth(-1)}>
              <MaterialIcons name="chevron-left" size={24} color={theme.colors.onSurface} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{getMonthLabel()}</Text>
            <TouchableOpacity style={styles.navBtn} onPress={() => navigateMonth(1)}>
              <MaterialIcons name="chevron-right" size={24} color={theme.colors.onSurface} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.weekdays}>
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d, i) => (
              <Text key={i} style={styles.weekdayText}>{d}</Text>
            ))}
          </View>
          
          <View style={styles.daysGrid}>
            {calendarDays.map((d, i) => {
              if (!d) return <View key={`empty-${i}`} style={styles.dayCell} />;
              
              const isSelected = d.dateStr === selectedDate;
              let dotColor = 'transparent';
              if (d.status === 'present') dotColor = theme.colors.secondary;
              else if (d.status === 'absent') dotColor = theme.colors.error;
              else if (d.status === 'partial') dotColor = '#f59e0b';

              return (
                <TouchableOpacity 
                  key={`day-${i}`} 
                  style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                  onPress={() => { haptics.selection(); setSelectedDate(d.dateStr); }}
                >
                  <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>{d.day}</Text>
                  <View style={[styles.dayDot, { backgroundColor: dotColor }]} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </AnimatedFadeIn>

      <AnimatedFadeIn delay={100}>
        <View style={styles.classesSectionHeader}>
          <Text style={styles.sectionTitle}>
            {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>
      </AnimatedFadeIn>
    </>
  );

  const renderEmptyState = () => {
    if (holiday) {
      return (
        <AnimatedFadeIn delay={150}>
          <View style={styles.holidayBanner}>
            <MaterialIcons name="celebration" size={32} color={theme.colors.onPrimaryContainer} style={styles.holidayIcon} />
            <View>
              <Text style={styles.holidayTitle}>Holiday</Text>
              <Text style={styles.holidayName}>{holiday.name}</Text>
            </View>
          </View>
        </AnimatedFadeIn>
      );
    }
    
    if (isSunday) {
      return (
        <AnimatedFadeIn delay={150}>
          <View style={styles.emptyState}>
            <MaterialIcons name="weekend" size={48} color={theme.colors.outlineVariant} />
            <Text style={styles.emptyTitle}>No classes on Sunday.</Text>
          </View>
        </AnimatedFadeIn>
      );
    }
    
    return (
      <AnimatedFadeIn delay={150}>
        <View style={styles.emptyState}>
          <MaterialIcons name="beach-access" size={48} color={theme.colors.outlineVariant} />
          <Text style={styles.emptyTitle}>No classes today.</Text>
        </View>
      </AnimatedFadeIn>
    );
  };

  const renderClass = ({ item: cls, index }: { item: any, index: number }) => {
    const rec = records.find(r => r.hour === cls.hour && r.subject === cls.subject);
    const status = rec ? rec.status : 'unmarked';
    
    let edgeClass = 'primary';
    if (status === 'present') edgeClass = 'secondary';
    if (status === 'absent') edgeClass = 'error';

    return (
      <AnimatedFadeIn delay={150 + (index * 40)}>
        <ClassCard
          cls={cls}
          status={status}
          edgeColor={edgeClass}
          onUpdateStatus={handleUpdateStatus}
        />
      </AnimatedFadeIn>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={(!holiday && !isSunday) ? classes : []}
        keyExtractor={(item, index) => `${item.subject}-${item.hour}-${index}`}
        ListHeaderComponent={renderHeader()}
        renderItem={renderClass}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState()}
      />
    </SafeAreaView>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { padding: 24, paddingBottom: 100 },
  header: { marginBottom: 24 },
  pageTitle: { fontSize: 24, fontWeight: '700', color: theme.colors.onSurface, fontFamily: 'Manrope-Bold' },
  
  calendarCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
    fontFamily: 'Manrope-SemiBold',
  },
  weekdays: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    fontFamily: 'Manrope-Medium',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  dayCellSelected: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
  },
  dayText: {
    fontSize: 14,
    color: theme.colors.onSurface,
    fontFamily: 'Manrope-Medium',
  },
  dayTextSelected: {
    color: 'white',
    fontFamily: 'Manrope-Bold',
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },

  classesSectionHeader: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 16,
    fontFamily: 'Manrope-SemiBold',
  },
  holidayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryContainer,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  holidayIcon: { marginRight: 16 },
  holidayTitle: { fontSize: 12, fontWeight: '600', color: theme.colors.onPrimaryContainer, marginBottom: 2, fontFamily: 'Manrope-SemiBold' },
  holidayName: { fontSize: 16, color: theme.colors.onPrimaryContainer, fontFamily: 'Manrope-Medium' },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: theme.colors.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.outlineVariant },
  emptyTitle: { fontSize: 16, color: theme.colors.onSurfaceVariant, marginTop: 16, fontFamily: 'Manrope-Medium' },
});
