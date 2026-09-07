import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Text } from '@/components/Text';
import { MaterialIcons } from '@expo/vector-icons';
import { storage } from '../../services/storage';
import { timetableService } from '../../services/timetable';
import { useThemeContext } from '../../context/ThemeContext';
import { Stack, useRouter } from 'expo-router';

const DEFAULT_TIMES: Record<number, {start: string, end: string}> = {
  1: { start: '08:50', end: '09:45' },
  2: { start: '09:45', end: '10:40' },
  3: { start: '10:50', end: '11:45' },
  4: { start: '11:45', end: '12:40' },
  5: { start: '13:30', end: '14:25' },
  6: { start: '14:25', end: '15:20' },
  7: { start: '15:30', end: '16:25' },
  8: { start: '16:25', end: '17:20' }
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ManageClasses() {
  const { theme, isDark, toggleTheme } = useThemeContext();
  const styles = makeStyles(theme);

  const router = useRouter();
  const [classes, setClasses] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [form, setForm] = useState({
    day: 'Monday', hour: 1, starttime: '08:50', endtime: '09:45', subject: '', room: '', startDate: ''
  });

  useEffect(() => { loadClasses(); }, []);

  const loadClasses = async () => {
    const data = await storage.getTimetable() || [];
    setClasses(data);
    const nextSlot = await timetableService.suggestNextSlot();
    setForm(f => ({
      ...f, day: nextSlot.day, hour: nextSlot.hour,
      starttime: DEFAULT_TIMES[nextSlot.hour]?.start || '',
      endtime: DEFAULT_TIMES[nextSlot.hour]?.end || ''
    }));
  };

  const handleHourChange = (hr: number) => {
    setForm(f => ({ ...f, hour: hr, starttime: DEFAULT_TIMES[hr]?.start || '', endtime: DEFAULT_TIMES[hr]?.end || '' }));
  };

  const handleSave = async () => {
    if (!form.subject) return Alert.alert("Error", "Subject is required");
    const existingIdx = classes.findIndex(c => c.day === form.day && c.hour === form.hour);
    let newClasses = [...classes];
    
    if (existingIdx > -1 && (!editingClass || (editingClass.day !== form.day || editingClass.hour !== form.hour))) {
      Alert.alert(
        "Overwrite Class?",
        "A class already exists for this day and hour. Overwrite?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Overwrite", onPress: async () => saveToStorage(newClasses, existingIdx) }
        ]
      );
      return;
    }
    
    if (editingClass) {
       const idx = classes.findIndex(c => c.day === editingClass.day && c.hour === editingClass.hour);
       if (idx > -1) newClasses[idx] = form;
    } else {
       newClasses.push(form);
    }
    await saveToStorage(newClasses, -1);
  };
  
  const saveToStorage = async (newClasses: any[], existingIdx: number) => {
    if (existingIdx > -1) newClasses[existingIdx] = form;
    await storage.saveTimetable(newClasses);
    await loadClasses();
    setIsAdding(false);
    setEditingClass(null);
  };

  const handleDelete = (cls: any) => {
    Alert.alert("Delete Class", `Delete ${cls.subject} on ${cls.day}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        const newClasses = classes.filter(c => !(c.day === cls.day && c.hour === cls.hour));
        await storage.saveTimetable(newClasses);
        await loadClasses();
      }}
    ]);
  };

  const openEdit = (cls: any) => {
    setForm({ ...cls });
    setEditingClass(cls);
    setIsAdding(true);
  };

  const sortedClasses = [...classes].sort((a, b) => {
    if (a.day === b.day) return a.hour - b.hour;
    return DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
  });

  const grouped = DAYS.reduce((acc: any, day) => {
    const dayCls = sortedClasses.filter(c => c.day === day);
    if (dayCls.length > 0) acc[day] = dayCls;
    return acc;
  }, {});

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: isAdding ? (editingClass ? 'Edit Class' : 'Add Class') : 'Manage Classes',
          headerLeft: () => (
            <TouchableOpacity onPress={() => isAdding ? (setIsAdding(false), setEditingClass(null)) : router.back()} style={{marginLeft: 0}}>
               <MaterialIcons name={isAdding ? "arrow-back" : "close"} size={24} color={theme.colors.onSurface} />
            </TouchableOpacity>
          ),
          headerRight: () => !isAdding ? (
            <TouchableOpacity onPress={() => setIsAdding(true)} style={{marginRight: 0}}>
               <MaterialIcons name="add" size={28} color={theme.colors.primary} />
            </TouchableOpacity>
          ) : null
        }} 
      />
      
      {!isAdding ? (
        <ScrollView style={styles.listContainer}>
          {sortedClasses.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="calendar-month" size={48} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.emptyTitle}>No classes yet</Text>
              <Text style={styles.emptySub}>Tap + to add your first class</Text>
            </View>
          ) : (
            Object.entries(grouped).map(([day, dayCls]: any) => (
              <View key={day} style={styles.dayGroup}>
                <Text style={styles.dayLabel}>{day}</Text>
                {dayCls.map((cls: any) => (
                  <View key={`${cls.day}-${cls.hour}`} style={styles.classCard}>
                    <View style={styles.cardEdge} />
                    <View style={styles.cardBody}>
                      <View style={styles.cardTop}>
                        <View style={styles.timeWrap}>
                          <MaterialIcons name="schedule" size={14} color={theme.colors.onSurfaceVariant} />
                          <Text style={styles.timeText}>{cls.starttime}–{cls.endtime}</Text>
                        </View>
                        <View style={styles.actionRow}>
                          <TouchableOpacity onPress={() => openEdit(cls)} style={styles.iconBtn}>
                            <MaterialIcons name="edit" size={20} color={theme.colors.onSurfaceVariant} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDelete(cls)} style={styles.iconBtn}>
                            <MaterialIcons name="delete" size={20} color={theme.colors.error} />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <Text style={styles.subjectName}>{cls.subject}</Text>
                      {!!cls.room && (
                        <View style={styles.roomWrap}>
                          <MaterialIcons name="location-on" size={14} color={theme.colors.onSurfaceVariant} />
                          <Text style={styles.roomText}>{cls.room}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      ) : (
        <ScrollView style={styles.formContainer}>
          <Text style={styles.label}>Subject Name</Text>
          <TextInput 
            style={styles.input}
            placeholder="e.g. CS301 – Data Structures"
            value={form.subject}
            onChangeText={t => setForm(f => ({ ...f, subject: t }))}
            placeholderTextColor={theme.colors.outlineVariant}
          />

          <Text style={styles.label}>Day</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayChips}>
            {DAYS.map(day => (
              <TouchableOpacity 
                key={day} 
                style={[styles.dayChip, form.day === day && styles.dayChipActive]}
                onPress={() => setForm(f => ({ ...f, day }))}
              >
                <Text style={[styles.dayChipText, form.day === day && styles.dayChipTextActive]}>{day.slice(0, 3)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>Hour</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayChips}>
            {[1,2,3,4,5,6,7,8].map(h => (
              <TouchableOpacity 
                key={h} 
                style={[styles.dayChip, form.hour === h && styles.dayChipActive]}
                onPress={() => handleHourChange(h)}
              >
                <Text style={[styles.dayChipText, form.hour === h && styles.dayChipTextActive]}>Hr {h}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.label}>Start Time</Text>
              <TextInput 
                style={styles.input}
                value={form.starttime}
                onChangeText={t => setForm(f => ({ ...f, starttime: t }))}
              />
            </View>
            <View style={{width: 16}} />
            <View style={styles.flex1}>
              <Text style={styles.label}>End Time</Text>
              <TextInput 
                style={styles.input}
                value={form.endtime}
                onChangeText={t => setForm(f => ({ ...f, endtime: t }))}
              />
            </View>
          </View>

          <Text style={styles.label}>Room / Location</Text>
          <TextInput 
            style={styles.input}
            placeholder="Room number"
            value={form.room}
            onChangeText={t => setForm(f => ({ ...f, room: t }))}
            placeholderTextColor={theme.colors.outlineVariant}
          />
          
          <Text style={styles.label}>Class Start Date (optional)</Text>
          <TextInput 
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={form.startDate}
            onChangeText={t => setForm(f => ({ ...f, startDate: t }))}
            placeholderTextColor={theme.colors.outlineVariant}
          />

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
             <Text style={styles.saveBtnText}>{editingClass ? 'Save Changes' : 'Add Class'}</Text>
          </TouchableOpacity>
          
          {editingClass && (
            <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(editingClass)}>
               <Text style={styles.delBtnText}>Delete Class</Text>
            </TouchableOpacity>
          )}
          <View style={{height: 40}}/>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContainer: {
    padding: 16,
  },
  formContainer: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
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
  dayGroup: {
    marginBottom: 24,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurfaceVariant,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  classCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  cardEdge: {
    width: 6,
    backgroundColor: theme.colors.primary,
  },
  cardBody: {
    flex: 1,
    padding: 16,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    padding: 4,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 4,
  },
  roomWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  roomText: {
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.onSurface,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: theme.colors.surfaceContainer,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  dayChips: {
    flexDirection: 'row',
    paddingBottom: 8,
  },
  dayChip: {
    backgroundColor: theme.colors.surfaceContainer,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
  },
  dayChipActive: {
    backgroundColor: theme.colors.primary,
  },
  dayChipText: {
    fontSize: 14,
    color: theme.colors.onSurface,
    fontWeight: '500',
  },
  dayChipTextActive: {
    color: theme.colors.onPrimary,
  },
  row: {
    flexDirection: 'row',
  },
  flex1: {
    flex: 1,
  },
  saveBtn: {
    backgroundColor: theme.colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
  },
  saveBtnText: {
    color: theme.colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  delBtn: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  delBtnText: {
    color: theme.colors.error,
    fontSize: 16,
    fontWeight: '600',
  }
});
