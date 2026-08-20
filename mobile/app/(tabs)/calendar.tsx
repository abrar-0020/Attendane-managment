import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { Text } from '@/components/Text';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { storage } from '../../services/storage';
import { dateUtils } from '../../utils/dateUtils';
import { timetableService } from '../../services/timetable';
import { MaterialIcons } from '@expo/vector-icons';
import ClassCard from '../../components/ClassCard';
import { useThemeContext } from '../../context/ThemeContext';

export default function CalendarView() {
  const { theme, isDark, toggleTheme } = useThemeContext();
  const styles = makeStyles(theme);

  const [selectedDate, setSelectedDate] = useState(dateUtils.formatDate(new Date()));
  const [classes, setClasses] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [holiday, setHoliday] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      loadDateData(selectedDate);
    }, [selectedDate])
  );

  const loadDateData = async (dateStr: string) => {
    const dayClasses = await timetableService.getClassesForDate(dateStr);
    const dayHoliday = await timetableService.getHolidayForDate(dateStr);
    const allRecords = await storage.getRecords();
    
    setClasses(dayClasses);
    setHoliday(dayHoliday);
    setRecords(allRecords.filter((r: any) => r.date === dateStr));
  };

  const handleUpdateStatus = async (subject: string, hour: string, status: string) => {
    await storage.addRecord({ date: selectedDate, subject, hour, status });
    const allRecords = await storage.getRecords();
    setRecords(allRecords.filter((r: any) => r.date === selectedDate));
  };

  const navigateDay = (direction: number) => {
    const current = dateUtils.parseDate(selectedDate);
    current.setDate(current.getDate() + direction);
    setSelectedDate(dateUtils.formatDate(current));
  };

  const getDayName = () => {
    const d = dateUtils.parseDate(selectedDate);
    return d.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const getDateLabel = () => {
    const d = dateUtils.parseDate(selectedDate);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isToday = selectedDate === dateUtils.formatDate(new Date());
  const isSunday = dateUtils.getDayName(dateUtils.parseDate(selectedDate)) === 'Sunday';
  const currentDayIndex = dateUtils.parseDate(selectedDate).getDay() - 1; // 0=Mon, 4=Fri

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>Timetable</Text>
        </View>

        {/* Day Selector */}
        <View style={styles.daySelectorSection}>
          <View style={styles.daySelector}>
            <TouchableOpacity style={styles.navBtn} onPress={() => navigateDay(-1)}>
              <MaterialIcons name="chevron-left" size={28} color={theme.colors.onSurface} />
            </TouchableOpacity>
            <View style={styles.dayCenter}>
              <Text style={styles.dayName}>{getDayName()}</Text>
              <Text style={styles.dateLabel}>{getDateLabel()}</Text>
            </View>
            <TouchableOpacity style={styles.navBtn} onPress={() => navigateDay(1)}>
              <MaterialIcons name="chevron-right" size={28} color={theme.colors.onSurface} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.dotsContainer}>
            {[0, 1, 2, 3, 4].map(idx => (
              <View 
                key={idx} 
                style={[
                  styles.dot, 
                  currentDayIndex === idx && styles.dotActive
                ]} 
              />
            ))}
          </View>
        </View>

        {/* Classes List */}
        <View style={styles.classesSection}>
          {holiday && (
            <View style={styles.holidayBanner}>
              <MaterialIcons name="celebration" size={32} color={theme.colors.tertiary} style={styles.holidayIcon} />
              <View>
                <Text style={styles.holidayTitle}>Holiday</Text>
                <Text style={styles.holidayName}>{holiday.name}</Text>
              </View>
            </View>
          )}

          {!holiday && isSunday && (
            <View style={styles.emptyState}>
              <MaterialIcons name="weekend" size={48} color={theme.colors.outlineVariant} />
              <Text style={styles.emptyTitle}>No classes on Sunday.</Text>
              <Text style={styles.emptySub}>Enjoy your weekend!</Text>
            </View>
          )}

          {!holiday && !isSunday && classes.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialIcons name="beach-access" size={48} color={theme.colors.outlineVariant} />
              <Text style={styles.emptyTitle}>No classes today.</Text>
              <Text style={styles.emptySub}>You're all clear!</Text>
            </View>
          )}

          {!holiday && !isSunday && classes.map((cls, idx) => {
            const rec = records.find(r => r.hour === cls.hour && r.subject === cls.subject);
            const status = rec ? rec.status : 'unmarked';
            
            let edgeClass = 'primary';
            if (status === 'present') edgeClass = 'secondary';
            if (status === 'absent') edgeClass = 'error';

            let showLunchBreak = false;
            const nextCls = classes[idx + 1];
            if (nextCls) {
              const currentHourNum = Number(cls.hour);
              const nextHourNum = Number(nextCls.hour);
              
              if (!isNaN(currentHourNum) && !isNaN(nextHourNum)) {
                 if (currentHourNum <= 4 && nextHourNum >= 5) {
                    showLunchBreak = true;
                 }
              } else {
                const thisEnd = cls.endtime ? cls.endtime.replace(/\s*[A-Z]+/i, '').trim() : '';
                if (thisEnd.includes('12:35') || thisEnd.includes('12:40') || thisEnd.includes('12:45')) {
                   showLunchBreak = true;
                }
              }
            }

            return (
              <View key={`${cls.subject}-${cls.hour}-${idx}`}>
                <ClassCard
                  cls={cls}
                  status={status}
                  edgeColor={edgeClass}
                  onUpdateStatus={handleUpdateStatus}
                />
                
                {showLunchBreak && (
                   <View style={styles.lunchBreak}>
                     <View style={styles.lunchLine} />
                     <View style={styles.lunchTextRow}>
                       <MaterialIcons name="restaurant" size={16} color={theme.colors.onSurfaceVariant} />
                       <Text style={styles.lunchText}>Lunch Break (12:35 PM - 01:25 PM)</Text>
                     </View>
                     <View style={styles.lunchLine} />
                   </View>
                )}
              </View>
            );
          })}
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
    marginBottom: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 56,
    paddingBottom: 40,
  },
  daySelectorSection: {
    marginBottom: 24,
  },
  daySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCenter: {
    alignItems: 'center',
  },
  dayName: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  dateLabel: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.surfaceContainerHighest,
  },
  dotActive: {
    backgroundColor: theme.colors.primary,
    width: 24,
  },
  classesSection: {
    marginTop: 8,
  },
  holidayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.tertiaryContainer,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  holidayIcon: {
    marginRight: 16,
  },
  holidayTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onTertiaryContainer,
    marginBottom: 2,
  },
  holidayName: {
    fontSize: 18,
    color: theme.colors.onTertiaryContainer,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginTop: 16,
  },
  emptySub: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginTop: 8,
  },
  lunchBreak: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  lunchLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.surfaceContainerHighest,
  },
  lunchTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  lunchText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.onSurfaceVariant,
  }
});
