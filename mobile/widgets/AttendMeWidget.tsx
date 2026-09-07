/**
 * AttendMe Home Screen Widget
 * Matches the exact Stitch design specification from new ui/stitch_attendme_widget.
 */
import React from 'react';
import {
  FlexWidget,
  TextWidget,
  SvgWidget,
} from 'react-native-android-widget';

interface WidgetProps {
  percentage: number;   // 0-100 attendance %
  subject: string;      // next class subject name
  time: string;         // e.g. "10:30 AM"
  room: string;         // e.g. "Room 402"
  hasNextClass: boolean;
  isSafe: boolean;      // percentage >= 75
}

function buildRingSvg(percentage: number, isSafe: boolean): string {
  const color = isSafe ? '#126d27' : '#ab2126';
  const dash = Math.min(Math.max(percentage, 0), 100);

  return `<svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
    <path fill="none" stroke="${color}" stroke-opacity="0.12" stroke-width="4" stroke-linecap="round"
      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
    <path fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round"
      stroke-dasharray="${dash}, 100"
      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
      transform="rotate(-90 18 18)"/>
    <text x="18" y="21" text-anchor="middle" font-size="8.5" font-weight="700"
      fill="${color}" font-family="sans-serif">${percentage}%</text>
  </svg>`;
}

export function AttendMeWidget({
  percentage,
  subject,
  time,
  room,
  hasNextClass,
  isSafe,
}: WidgetProps) {
  return (
    <FlexWidget
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e1e3e4',
        padding: 12,
        height: 'match_parent',
        width: 'match_parent',
      }}
      clickAction="OPEN_APP"
    >
      {/* Left Side: Status Ring */}
      <SvgWidget
        svg={buildRingSvg(percentage, isSafe)}
        style={{ width: 48, height: 48, marginRight: 12 }}
      />

      {/* Right Side: Next Class Info */}
      <FlexWidget
        style={{ flex: 1, flexDirection: 'column', justifyContent: 'center' }}
      >
        {/* Dot + "NEXT CLASS" label row */}
        <FlexWidget
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}
        >
          <FlexWidget
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: '#4352a5',
              marginRight: 6,
            }}
          />
          <TextWidget
            text="NEXT CLASS"
            style={{
              fontSize: 10,
              fontWeight: '700',
              color: '#4352a5',
              letterSpacing: 1,
            }}
          />
        </FlexWidget>

        {/* Subject Header */}
        <TextWidget
          text={hasNextClass ? subject : 'No more classes today!'}
          maxLines={1}
          style={{
            fontSize: 16,
            fontWeight: '600',
            color: '#191c1d',
          }}
        />

        {/* Time & Room Details */}
        {hasNextClass && (
          <TextWidget
            text={`${time}${room ? ' · ' + room : ''}`}
            maxLines={1}
            style={{
              fontSize: 12,
              color: '#454651',
              marginTop: 2,
            }}
          />
        )}
      </FlexWidget>
    </FlexWidget>
  );
}

