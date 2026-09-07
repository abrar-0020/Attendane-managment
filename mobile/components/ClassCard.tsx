import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, LayoutAnimation } from 'react-native';
import { Text } from '@/components/Text';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeContext } from '../context/ThemeContext';
import { LinearGradient } from '@/components/LinearGradient';

const STATUS_LABELS: any = {
  present: 'Present',
  absent: 'Absent',
  unmarked: 'Unmarked',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: any = {
  present: '#86efac', // light green
  absent: '#fca5a5', // light red
  unmarked: 'rgba(255,255,255,0.8)',
  cancelled: '#fca5a5',
};

export default function ClassCard({ cls, status, onUpdateStatus }: any) {
  const { theme } = useThemeContext();
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
  const statusColor = STATUS_COLORS[status] || 'white';
  
  const styles = makeStyles(theme);

  return (
    <View style={[styles.cardContainer, isCancelled && styles.cardCancelled]}>
      <TouchableOpacity activeOpacity={0.9} onPress={toggleMenu}>
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDark]}
          style={styles.cardGradient}
        >
          {/* Left Column */}
          <View style={styles.leftCol}>
            <View style={styles.leftBox}>
              <Text style={styles.leftBoxBig}>{String(cls.hour).padStart(2, '0')}</Text>
              <Text style={styles.leftBoxSmall}>Hour</Text>
            </View>
            <View style={styles.roomRow}>
              <MaterialIcons name="meeting-room" size={12} color="rgba(255,255,255,0.7)" />
              <Text style={[styles.roomText, isCancelled && styles.textLineThrough]} numberOfLines={1}>
                {cls.room || 'TBA'}
              </Text>
            </View>
          </View>
          
          {/* Right Content */}
          <View style={styles.rightContent}>
            <Text style={[styles.subjectName, isCancelled && styles.textLineThrough]} numberOfLines={2}>
              {cls.subjectName || cls.subject}
            </Text>
            
            <View style={styles.statsRow}>
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>Start</Text>
                <Text style={[styles.statValue, isCancelled && styles.textLineThrough]}>
                  {cls.starttime || '-'}
                </Text>
              </View>
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>End</Text>
                <Text style={[styles.statValue, isCancelled && styles.textLineThrough]}>
                  {cls.endtime || '-'}
                </Text>
              </View>
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>Status</Text>
                <Text style={[styles.statValue, { color: statusColor }]}>
                  {STATUS_LABELS[status]}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Action Menu (Expands downwards) */}
      {showMenu && (
        <View style={styles.menuArea}>
          <View style={styles.menuButtons}>
            <TouchableOpacity style={styles.menuOption} onPress={() => handleUpdate('present')}>
              <MaterialIcons name="check" size={20} color={theme.colors.secondary} />
              <Text style={[styles.menuOptionText, { color: theme.colors.secondary }]}>Present</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuOption} onPress={() => handleUpdate('absent')}>
              <MaterialIcons name="close" size={20} color={theme.colors.error} />
              <Text style={[styles.menuOptionText, { color: theme.colors.error }]}>Absent</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuOption} onPress={() => handleUpdate('unmarked')}>
              <MaterialIcons name="undo" size={20} color={theme.colors.onSurfaceVariant} />
              <Text style={[styles.menuOptionText, { color: theme.colors.onSurfaceVariant }]}>Reset</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuOption} onPress={() => handleUpdate('cancelled')}>
              <MaterialIcons name="block" size={20} color={theme.colors.error} />
              <Text style={[styles.menuOptionText, { color: theme.colors.error }]}>Cancel Class</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  cardContainer: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardCancelled: {
    opacity: 0.6,
  },
  cardGradient: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  leftCol: {
    alignItems: 'center',
    marginRight: 16,
    width: 60,
  },
  leftBox: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftBoxBig: {
    fontSize: 22,
    fontFamily: 'Manrope-Bold',
    color: 'white',
    marginBottom: -4,
  },
  leftBoxSmall: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255,255,255,0.8)',
  },
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  roomText: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255,255,255,0.8)',
  },
  rightContent: {
    flex: 1,
    justifyContent: 'center',
  },
  subjectName: {
    fontSize: 16,
    fontFamily: 'Manrope-Bold',
    color: 'white',
    marginBottom: 10,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCol: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Manrope-Regular',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: 'white',
  },
  textLineThrough: {
    textDecorationLine: 'line-through',
    color: 'rgba(255,255,255,0.6)',
  },
  menuArea: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceContainerHighest,
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
    fontFamily: 'Manrope-Medium',
  },
});
