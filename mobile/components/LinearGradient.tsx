import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';

export type LinearGradientProps = {
  colors: string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

export function LinearGradient({ colors, style, children }: LinearGradientProps) {
  return (
    <View style={[{ backgroundColor: colors[0], overflow: 'hidden' }, style]}>
      {children}
    </View>
  );
}
