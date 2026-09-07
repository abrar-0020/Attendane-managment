import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Text } from '@/components/Text';
import { MaterialIcons } from '@expo/vector-icons';
import { storage } from '../../services/storage';
import { useThemeContext } from '../../context/ThemeContext';
import { Stack, useRouter } from 'expo-router';

export default function ManageHolidays() {
  const { theme, isDark, toggleTheme } = useThemeContext();
  const styles = makeStyles(theme);

  const router = useRouter();
  const [holidays, setHolidays] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({ date: '', name: '' });

  useEffect(() => { loadHolidays(); }, []);

  const loadHolidays = async () => {
    const data = await storage.getHolidays() || [];
    setHolidays(data);
  };

  const handleSave = async () => {
    if (!form.date || !form.name) return Alert.alert("Error", "Date and name are required");
    
    const existing = holidays.find(h => h.date === form.date);
    if (existing) {
      Alert.alert(
        "Overwrite Holiday?",
        "A holiday already exists on this date. Overwrite?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Overwrite", onPress: async () => saveToStorage(existing) }
        ]
      );
      return;
    }
    
    await saveToStorage(null);
  };
  
  const saveToStorage = async (existing: any) => {
    let newList = existing 
      ? holidays.map(h => h.date === form.date ? form : h)
      : [...holidays, form];
      
    newList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    await storage.saveHolidays(newList);
    setHolidays(newList);
    setIsAdding(false);
    setForm({ date: '', name: '' });
  };

  const handleDelete = (date: string) => {
    Alert.alert("Delete Holiday", "Delete this holiday?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        const newList = holidays.filter(h => h.date !== date);
        await storage.saveHolidays(newList);
        setHolidays(newList);
      }}
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: isAdding ? 'Add Holiday' : 'Manage Holidays',
          headerLeft: () => (
            <TouchableOpacity onPress={() => isAdding ? setIsAdding(false) : router.back()} style={{marginLeft: 0}}>
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
          {holidays.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="beach-access" size={48} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.emptyTitle}>No holidays added yet</Text>
              <Text style={styles.emptySub}>Tap + to add a holiday or break</Text>
            </View>
          ) : (
            <View style={styles.dayCards}>
              {holidays.map(h => (
                <View key={h.date} style={styles.classCard}>
                  <View style={[styles.cardEdge, { backgroundColor: theme.colors.secondary }]} />
                  <View style={styles.cardBody}>
                    <View style={styles.cardTop}>
                      <View style={styles.timeWrap}>
                        <MaterialIcons name="event" size={14} color={theme.colors.onSurfaceVariant} />
                        <Text style={styles.timeText}>
                          {new Date(h.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => handleDelete(h.date)} style={styles.iconBtn}>
                        <MaterialIcons name="delete" size={20} color={theme.colors.error} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.subjectName}>{h.name}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView style={styles.formContainer}>
          <Text style={styles.label}>Date *</Text>
          <TextInput 
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={form.date}
            onChangeText={t => setForm({ ...form, date: t })}
            placeholderTextColor={theme.colors.outlineVariant}
          />

          <Text style={styles.label}>Holiday Name *</Text>
          <TextInput 
            style={styles.input}
            placeholder="e.g. Diwali, Republic Day"
            value={form.name}
            onChangeText={t => setForm({ ...form, name: t })}
            placeholderTextColor={theme.colors.outlineVariant}
          />

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
             <Text style={styles.saveBtnText}>Save Holiday</Text>
          </TouchableOpacity>
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
  dayCards: {
    marginTop: 8,
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
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  iconBtn: {
    padding: 4,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
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
  }
});
