/**
 * Widget Task Handler
 * Called by the Android widget system to render & update the widget.
 * This file is the bridge between Android and our React widget component.
 */
import { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { storage } from '../services/storage';
import { timetableService } from '../services/timetable';
import { dateUtils } from '../utils/dateUtils';
import { AttendMeWidget } from './AttendMeWidget';

const nameToWidget: Record<string, React.FC<any>> = {
  AttendMeWidget,
};

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;
  const Widget = nameToWidget[widgetInfo.widgetName];

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      // Load data from storage
      const data = await getWidgetData();
      props.renderWidget(<Widget {...data} />);
      break;
    }

    case 'WIDGET_CLICK': {
      if (props.clickAction === 'OPEN_APP') {
        // App will open via the default intent — no extra handling needed
      }
      break;
    }

    default:
      break;
  }
}

async function getWidgetData() {
  try {
    // --- Attendance percentage ---
    const timetable = await storage.getTimetable();
    const records = await storage.getRecords();
    const baseCounts = await storage.getBaseCounts();
    const subjects = [...new Set(timetable.map((t: any) => t.subject))];

    let totalAttended = 0;
    let totalClasses = 0;

    subjects.forEach((sub: any) => {
      const subRecords = records.filter(
        (r: any) => r.subject === sub && r.status !== 'unmarked'
      );
      const presentRecs = subRecords.filter((r: any) => r.status === 'present').length;
      const totalRecs = subRecords.length;
      const baseTotal = baseCounts[sub]?.total || 0;
      const baseAttended = baseCounts[sub]?.attended || 0;
      totalAttended += presentRecs + baseAttended;
      totalClasses += totalRecs + baseTotal;
    });

    const percentage = totalClasses > 0
      ? Math.round((totalAttended / totalClasses) * 100)
      : 0;
    const isSafe = percentage >= 75;

    // --- Next class ---
    const todayStr = dateUtils.formatDate(new Date());
    const todayClasses = await timetableService.getClassesForDate(todayStr);
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const next = todayClasses.find((cls: any) => {
      if (!cls.starttime) return false;
      const [h, m] = cls.starttime.split(':').map(Number);
      const classMinutes = h * 60 + (m || 0);
      return classMinutes >= currentMinutes - 30;
    });

    return {
      percentage,
      isSafe,
      hasNextClass: !!next,
      subject: next
        ? (next.subjectName && next.subjectName !== next.subject
            ? next.subjectName
            : next.subject) || 'No class'
        : 'Free time!',
      time: next?.starttime || '',
      room: next?.room || '',
    };
  } catch (e) {
    return {
      percentage: 0,
      isSafe: false,
      hasNextClass: false,
      subject: 'Open AttendMe',
      time: '',
      room: '',
    };
  }
}
