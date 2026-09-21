import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import MaterialIcon from './MaterialIcon';
import { useTheme } from '../theme/ThemeProvider';

interface AnimatedWifiIconProps {
  progress?: Animated.AnimatedInterpolation<number>;
  isOnline?: boolean;
  color?: string;
  size?: number;
}

export default function AnimatedWifiIcon({ progress, isOnline, color, size = 22 }: AnimatedWifiIconProps) {
  const { colors } = useTheme();
  const iconColor = color || colors.primary;

  // If progress is provided (during slide), use it. 
  // Otherwise, fallback to static state based on isOnline.
  const animatedScale = progress ? progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0], // 1 = fully drawn line (offline), 0 = no line (online)
    extrapolate: 'clamp',
  }) : (isOnline ? 0 : 1);

  return (
    <View style={styles.container}>
      <MaterialIcon name="wifi" size={size} color={iconColor} />
      
      {/* The diagonal cross line */}
      <Animated.View
        style={[
          styles.crossLine,
          {
            backgroundColor: iconColor,
            height: size + 4,
            transform: [
              { rotate: '45deg' },
              { scaleY: animatedScale }
            ]
          }
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  crossLine: {
    position: 'absolute',
    width: 2,
    borderRadius: 1,
  },
});
