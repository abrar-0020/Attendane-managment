import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';

import { useFocusEffect } from 'expo-router';

interface AnimatedFadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
  translateY?: number;
}

export const AnimatedFadeIn: React.FC<AnimatedFadeInProps> = ({
  children,
  delay = 0,
  duration = 500,
  style,
  translateY = 20,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(translateY)).current;

  useFocusEffect(
    React.useCallback(() => {
      // Reset values immediately to prevent flashing
      opacity.setValue(0);
      translateYAnim.setValue(translateY);

      const anim = Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: duration,
          delay: delay,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 0,
          duration: duration,
          delay: delay,
          useNativeDriver: true,
        }),
      ]);

      anim.start();

      return () => {
        anim.stop();
      };
    }, [delay, duration, opacity, translateYAnim, translateY])
  );

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: [{ translateY: translateYAnim }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};
