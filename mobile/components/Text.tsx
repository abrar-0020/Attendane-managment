import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from "react-native";

export type TextProps = RNTextProps & {
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
};

export function Text(props: TextProps) {
  const { style, weight, ...otherProps } = props;
  
  let fontFamily = 'Manrope';
  if (weight === 'medium') fontFamily = 'Manrope-Medium';
  else if (weight === 'semibold') fontFamily = 'Manrope-SemiBold';
  else if (weight === 'bold') fontFamily = 'Manrope-Bold';
  // Attempt to infer from style.fontWeight if present
  else if (style) {
    const flatStyle = StyleSheet.flatten(style);
    if (flatStyle.fontWeight) {
      const fw = String(flatStyle.fontWeight);
      if (fw === '500') fontFamily = 'Manrope-Medium';
      else if (fw === '600' || fw === 'bold') fontFamily = 'Manrope-SemiBold'; // Using semibold for bold often looks better on Manrope
      else if (fw === '700' || fw === '800' || fw === '900') fontFamily = 'Manrope-Bold';
    }
  }

  return <RNText style={[{ fontFamily }, style]} {...otherProps} />;
}
