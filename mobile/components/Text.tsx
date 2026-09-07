import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from "react-native";

export type TextProps = RNTextProps & {
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
};

export function Text(props: TextProps) {
  const { style, weight, ...otherProps } = props;
  
  let fontFamily = 'Manrope-Regular'; // Now correctly mapped in useFonts
  if (weight === 'medium') fontFamily = 'Manrope-Medium';
  else if (weight === 'semibold') fontFamily = 'Manrope-SemiBold';
  else if (weight === 'bold') fontFamily = 'Manrope-Bold';
  
  // Extract and remove fontWeight from style to prevent custom font breaking
  let finalStyle: any = {};
  if (style) {
    const flatStyle = StyleSheet.flatten(style);
    const { fontWeight, fontFamily: incomingFontFamily, ...restStyle } = flatStyle as any;
    finalStyle = restStyle;
    
    // If they explicitly passed a fontFamily, respect it (though we usually don't need to)
    if (incomingFontFamily && !incomingFontFamily.startsWith('Manrope')) {
      fontFamily = incomingFontFamily;
    } else if (incomingFontFamily && incomingFontFamily.startsWith('Manrope')) {
      fontFamily = incomingFontFamily;
    }

    if (!weight && fontWeight) {
      const fw = String(fontWeight);
      if (fw === '500') fontFamily = 'Manrope-Medium';
      else if (fw === '600' || fw === 'bold') fontFamily = 'Manrope-SemiBold';
      else if (fw === '700' || fw === '800' || fw === '900') fontFamily = 'Manrope-Bold';
    }
  }

  return <RNText style={[{ fontFamily }, finalStyle]} {...otherProps} />;
}
