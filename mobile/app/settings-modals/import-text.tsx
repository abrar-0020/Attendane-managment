import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Text } from '@/components/Text';
import { MaterialIcons } from '@expo/vector-icons';
import { parseTimetableText } from '../../utils/timetableParser';
import { storage } from '../../services/storage';
import { useThemeContext } from '../../context/ThemeContext';
import { Stack, useRouter } from 'expo-router';

export default function ImportTextModal() {
  const { theme, isDark, toggleTheme } = useThemeContext();
  const styles = makeStyles(theme);

  const router = useRouter();
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [rawText, setRawText] = useState('');
  const [parsedData, setParsedData] = useState<any>(null);

  const handleAnalyze = () => {
    if (!rawText.trim()) {
      Alert.alert("Error", "Please paste your timetable text first.");
      return;
    }
    
    try {
      const result = parseTimetableText(rawText);
      setParsedData(result);
      setStep('preview');
    } catch (e: any) {
      Alert.alert("Parse Error", e.message || "Failed to parse timetable text.");
    }
  };

  const handleImport = async () => {
    if (!parsedData || parsedData.entries.length === 0) return;
    
    await storage.importTimetableData(parsedData.entries);
    if (parsedData.profile) {
      await storage.saveProfile(parsedData.profile);
    }
    
    Alert.alert("Success", `Successfully imported ${parsedData.entries.length} classes!`, [
      { text: "OK", onPress: () => router.back() }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: step === 'input' ? 'Import Timetable' : 'Import Preview',
          headerLeft: () => (
            <TouchableOpacity onPress={() => step === 'preview' ? setStep('input') : router.back()} style={{marginLeft: 0}}>
               <MaterialIcons name={step === 'preview' ? 'arrow-back' : "close"} size={24} color={theme.colors.onSurface} />
            </TouchableOpacity>
          ),
        }} 
      />

      <ScrollView style={styles.content}>
        {step === 'input' ? (
          <>
            <Text style={styles.subtitle}>Paste your timetable data and import it automatically.</Text>
            
            <TextInput
              style={styles.textarea}
              placeholder="Paste your raw timetable text here..."
              multiline
              textAlignVertical="top"
              value={rawText}
              onChangeText={setRawText}
              placeholderTextColor={theme.colors.outlineVariant}
            />
            
            <TouchableOpacity style={styles.primaryBtn} onPress={handleAnalyze}>
              <Text style={styles.primaryBtnText}>Analyze Timetable</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.summaryRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{parsedData.subjects?.length || 0}</Text>
                <Text style={styles.statLabel}>Subjects</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{parsedData.entries?.length || 0}</Text>
                <Text style={styles.statLabel}>Entries</Text>
              </View>
            </View>

            {parsedData.errors && parsedData.errors.length > 0 && (
              <View style={[styles.alertBox, styles.errorBox]}>
                <View style={styles.alertHeader}>
                  <MaterialIcons name="error" size={20} color={theme.colors.error} />
                  <Text style={styles.errorTitle}>Could not import some entries.</Text>
                </View>
                {parsedData.errors.map((err: string, i: number) => (
                  <Text key={i} style={styles.errorItem}>• {err}</Text>
                ))}
              </View>
            )}

            {parsedData.warnings && parsedData.warnings.length > 0 && (
              <View style={[styles.alertBox, styles.warningBox]}>
                <View style={styles.alertHeader}>
                  <MaterialIcons name="warning" size={20} color="#F59E0B" />
                  <Text style={styles.warningTitle}>Warnings</Text>
                </View>
                {parsedData.warnings.map((warn: string, i: number) => (
                  <Text key={i} style={styles.warningItem}>• {warn}</Text>
                ))}
              </View>
            )}

            {parsedData.subjects && parsedData.subjects.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Subjects Found</Text>
                <View style={styles.subjectList}>
                  {parsedData.subjects.map((sub: any, i: number) => (
                    <View key={i} style={styles.subjectItem}>
                      <Text style={styles.subCode}>{sub.code}</Text>
                      <Text style={styles.subName}>{sub.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            
            <TouchableOpacity 
              style={[styles.primaryBtn, parsedData.entries?.length === 0 && styles.disabledBtn]} 
              onPress={handleImport}
              disabled={parsedData.entries?.length === 0}
            >
              <Text style={styles.primaryBtnText}>Import {parsedData.entries?.length || 0} Classes</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep('input')}>
              <Text style={styles.secondaryBtnText}>Cancel</Text>
            </TouchableOpacity>
            
            <View style={{height: 40}} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 24,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 24,
  },
  textarea: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: theme.colors.onSurface,
    minHeight: 200,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  primaryBtnText: {
    color: theme.colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryBtn: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryBtnText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  disabledBtn: {
    backgroundColor: theme.colors.surfaceVariant,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: theme.colors.surfaceContainerLowest,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  statNum: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
  },
  alertBox: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorBox: {
    backgroundColor: theme.colors.errorContainer,
  },
  warningBox: {
    backgroundColor: '#FEF3C7',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.error,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#92400E',
  },
  errorItem: {
    fontSize: 13,
    color: theme.colors.error,
    marginLeft: 28,
    marginBottom: 4,
  },
  warningItem: {
    fontSize: 13,
    color: '#92400E',
    marginLeft: 28,
    marginBottom: 4,
  },
  section: {
    marginTop: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 12,
  },
  subjectList: {
    gap: 8,
  },
  subjectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceContainerLowest,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  subCode: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
    width: 80,
  },
  subName: {
    fontSize: 14,
    color: theme.colors.onSurface,
    flex: 1,
  }
});
