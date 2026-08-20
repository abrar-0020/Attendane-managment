import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, LayoutAnimation } from 'react-native';
import { Text } from '@/components/Text';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeContext } from '../context/ThemeContext';

export default function ClassCard({ cls, status, edgeColor, onUpdateStatus }: any) {
  const { theme } = useThemeContext();
  const styles = makeStyles(theme);
  const [showMenu, setShowMenu] = useState(false);

  const toggleMenu = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowMenu(!showMenu);
  };

  const handleUpdate = (newStatus: string) => {
    onUpdateStatus(cls.subject, cls.hour, newStatus);
    setShowMenu(false);
  };

  const isCancelled = status === 'cancelled';
  
  let edgeColorValue = theme.colors.primary;
  if (edgeColor === 'secondary') edgeColorValue = theme.colors.secondary;
  if (edgeColor === 'error' || isCancelled) edgeColorValue = theme.colors.error;

  return (
    <View style={[styles.card, isCancelled && styles.cardCancelled]}>
      <View style={[styles.edge, { backgroundColor: edgeColorValue }]} />
      
      <View style={styles.body}>
        <View style={styles.header}>
          <Text style={[styles.subjectName, isCancelled && styles.textLineThrough]}>
            {cls.subjectName || cls.subject}
          </Text>
          {isCancelled && (
            <View style={styles.cancelledPill}>
              <Text style={styles.cancelledPillText}>Cancelled</Text>
            </View>
          )}
        </View>
        
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <MaterialIcons name="schedule" size={16} color={theme.colors.onSurfaceVariant} />
            <Text style={[styles.metaText, isCancelled && styles.textLineThrough]}>
              {cls.starttime && cls.endtime ? `${cls.starttime} - ${cls.endtime}` : `Hr ${cls.hour}`}
            </Text>
          </View>
          <Text style={styles.metaDot}>•</Text>
          <View style={styles.metaItem}>
            <MaterialIcons name="meeting-room" size={16} color={theme.colors.onSurfaceVariant} />
            <Text style={[styles.metaText, isCancelled && styles.textLineThrough]}>
              {cls.room || 'TBA'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.menuBtn} onPress={toggleMenu}>
          <MaterialIcons name={showMenu ? "expand-less" : "more-vert"} size={24} color={theme.colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      {showMenu && (
        <View style={styles.menuArea}>
          <View style={styles.divider} />
          <View style={styles.menuButtons}>
            <TouchableOpacity style={styles.menuOption} onPress={() => handleUpdate('present')}>
              <MaterialIcons name="check" size={20} color={status === 'present' ? theme.colors.secondary : theme.colors.onSurfaceVariant} />
              <Text style={[styles.menuOptionText, status === 'present' && { color: theme.colors.secondary }]}>Present</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuOption} onPress={() => handleUpdate('absent')}>
              <MaterialIcons name="close" size={20} color={status === 'absent' ? theme.colors.error : theme.colors.onSurfaceVariant} />
              <Text style={[styles.menuOptionText, status === 'absent' && { color: theme.colors.error }]}>Absent</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuOption} onPress={() => handleUpdate('unmarked')}>
              <MaterialIcons name="undo" size={20} color={status === 'unmarked' ? theme.colors.outline : theme.colors.onSurfaceVariant} />
              <Text style={[styles.menuOptionText, status === 'unmarked' && { color: theme.colors.outline }]}>Reset</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuOption} onPress={() => handleUpdate('cancelled')}>
              <MaterialIcons name="block" size={20} color={status === 'cancelled' ? theme.colors.error : theme.colors.onSurfaceVariant} />
              <Text style={[styles.menuOptionText, status === 'cancelled' && { color: theme.colors.error }]}>Cancel Class</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  cardCancelled: {
    opacity: 0.6,
  },
  edge: {
    width: 6,
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  body: {
    flex: 1,
    padding: 16,
    paddingLeft: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  subjectName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  textLineThrough: {
    textDecorationLine: 'line-through',
    color: theme.colors.onSurfaceVariant,
  },
  cancelledPill: {
    marginLeft: 12,
    backgroundColor: theme.colors.errorContainer,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cancelledPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.error,
    textTransform: 'uppercase',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  metaDot: {
    marginHorizontal: 8,
    color: theme.colors.onSurfaceVariant,
  },
  actions: {
    padding: 16,
    justifyContent: 'flex-start',
  },
  menuBtn: {
    padding: 4,
  },
  menuArea: {
    width: '100%',
    backgroundColor: theme.colors.surfaceContainerLow,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.surfaceContainerHighest,
  },
  menuButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  menuOption: {
    alignItems: 'center',
    gap: 4,
  },
  menuOptionText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.onSurfaceVariant,
  },
});
