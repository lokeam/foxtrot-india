import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { FoxydroidDoubleNoseRN } from './FoxydroidDoubleNoseRN';

type Props = {
  isReady: boolean;
  onFinish: () => void;
};

const { height } = Dimensions.get('window');

export function CustomSplashScreen({ isReady, onFinish }: Props) {
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isReady) {
      setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue: -height,
          duration: 350,
          useNativeDriver: true,
        }).start(() => {
          onFinish();
        });
      }, 2000);
    }
  }, [isReady, slideAnim, onFinish]);

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.content}>
        <FoxydroidDoubleNoseRN size={120} color="#FFFFFF" strokeWidth={2} />
      </View>
      <View style={styles.footer}>
        <Text style={styles.hashtag}>#FoxtrotIndia</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    zIndex: 9999,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: height * 0.15,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hashtag: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '400',
    letterSpacing: 0.5,
  },
});
