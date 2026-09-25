import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export default function SplashScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  
  // Animation values for the dots
  const [dot1] = useState(() => new Animated.Value(0));
  const [dot2] = useState(() => new Animated.Value(0));
  const [dot3] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (loading) return;

    const navigate = () => {
      if (user) {
        router.replace('/(tabs)/home');
        return;
      }
      router.replace('/login');
    };

    // When there's no session, go straight to login — don't sit on the splash.
    if (!user) {
      navigate();
      return () => {};
    }

    // Navigate after 3 seconds
    const timer = setTimeout(navigate, 3000);

    // Setup bounce animation
    const animateDot = (dot: any, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot, {
            toValue: -10,
            duration: 300,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animateDot(dot1, 0);
    animateDot(dot2, 150);
    animateDot(dot3, 300);

    return () => clearTimeout(timer);
  }, [user, loading, dot1, dot2, dot3]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Branding / Logo */}
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/images/bike.png')} 
            style={styles.logoImage} 
            resizeMode="contain"
          />
        </View>
        
        {/* App Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Ematix</Text>
          <Text style={styles.subtitle}>PARTNER & DRIVER</Text>
        </View>

        {/* Loading Indicator */}
        <View style={styles.loaderContainer}>
          <Animated.View style={[styles.dot, { transform: [{ translateY: dot1 }] }]} />
          <Animated.View style={[styles.dot, { transform: [{ translateY: dot2 }] }]} />
          <Animated.View style={[styles.dot, { transform: [{ translateY: dot3 }] }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#00174b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    width: 96,
    height: 96,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 24,
  },
  logoImage: {
    width: 64,
    height: 64,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#809ffe',
    letterSpacing: 2,
    marginTop: 8,
  },
  loaderContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ffffff',
  },
});
