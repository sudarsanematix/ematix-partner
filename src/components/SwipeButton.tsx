import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  LayoutChangeEvent,
  Dimensions,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, type } from '../theme/typography';
import MaterialIcon from './MaterialIcon';

interface SwipeButtonProps {
  onComplete: () => void;
  title: string;
  color?: string;
  targetColor?: string;
  textColor?: string;
  iconColor?: string;
  thumbIcon?: string;
  renderThumbIcon?: (progress: Animated.AnimatedInterpolation<number>) => React.ReactNode;
}

export default function SwipeButton({ 
  onComplete, 
  title, 
  color, 
  targetColor,
  textColor = '#FFF',
  iconColor,
  thumbIcon = 'keyboard-double-arrow-right',
  renderThumbIcon,
}: SwipeButtonProps) {
  const { colors } = useTheme();
  const btnColor = color || colors.primary;
  const thumbIconColor = iconColor || btnColor;
  const [containerWidth, setContainerWidth] = useState(0);
  const thumbWidth = 56;
  const padding = 8;
  const screenWidth = Dimensions.get('window').width;
  const defaultContainerWidth = screenWidth - 32; 
  const actualContainerWidth = containerWidth > 0 ? containerWidth : defaultContainerWidth;
  const maxTranslate = Math.max(0, actualContainerWidth - thumbWidth - padding * 2);

  const pan = useRef(new Animated.ValueXY()).current;
  const isCompletedRef = useRef(false);

  // Reset state when title changes
  useEffect(() => {
    isCompletedRef.current = false;
    Animated.spring(pan, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
    }).start();
  }, [title]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (isCompletedRef.current || maxTranslate === 0) return;
        let newX = gestureState.dx;
        if (newX < 0) newX = 0;
        if (newX > maxTranslate) newX = maxTranslate;
        pan.setValue({ x: newX, y: 0 });
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isCompletedRef.current || maxTranslate === 0) return;
        if (gestureState.dx > maxTranslate * 0.75) {
          // Complete
          isCompletedRef.current = true;
          Animated.timing(pan, {
            toValue: { x: maxTranslate, y: 0 },
            duration: 150,
            useNativeDriver: false,
          }).start(() => {
            onComplete();
          });
        } else {
          // Snap back
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
            friction: 5,
          }).start();
        }
      },
    })
  ).current;

  const handleLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  const animatedBgColor = pan.x.interpolate({
    inputRange: [0, Math.max(1, maxTranslate)],
    outputRange: [btnColor, targetColor || btnColor],
    extrapolate: 'clamp',
  });

  const animatedTextColor = pan.x.interpolate({
    inputRange: [0, Math.max(1, maxTranslate)],
    outputRange: [textColor, targetColor ? '#FFF' : textColor],
    extrapolate: 'clamp',
  });

  const progress = pan.x.interpolate({
    inputRange: [0, Math.max(1, maxTranslate)],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[styles.container, { backgroundColor: animatedBgColor }]}
      onLayout={handleLayout}
    >
      <Animated.Text style={[styles.title, { color: animatedTextColor }]}>
        {title}
      </Animated.Text>
      
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.thumb,
          { backgroundColor: '#FFF' },
          { transform: [{ translateX: pan.x }] },
        ]}
      >
        {renderThumbIcon ? (
          renderThumbIcon(progress)
        ) : (
          <MaterialIcon name={thumbIcon as any} size={28} color={thumbIconColor} />
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    padding: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  title: {
    ...type.headlineSm,
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    zIndex: 1,
    paddingLeft: 40, // offset slightly to balance the thumb visually
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    position: 'absolute',
    left: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
