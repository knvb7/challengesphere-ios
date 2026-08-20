import React, { useEffect, useRef } from 'react';
import { Animated, ImageSourcePropType, StyleSheet, View } from 'react-native';
import GenericUserAvatar from './GenericUserAvatar';

const people: { source?: ImageSourcePropType; x: number; y: number; size: number; generic?: boolean }[] = [
  { source: require('../../assets/images/user-female-1.png'), x: 16, y: 32, size: 42 },
  { source: require('../../assets/images/user-male-1.png'), x: 64, y: 12, size: 47 },
  { source: require('../../assets/images/user-male-2.png'), x: 116, y: 4, size: 52 },
  { source: require('../../assets/images/user-male-3.png'), x: 173, y: 12, size: 47 },
  { x: 222, y: 32, size: 42, generic: true },
];

export default function CommunityGatheringAnimation() {
  const arrivals = useRef(people.map(() => new Animated.Value(0))).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const entrance = Animated.stagger(
      100,
      arrivals.map((value) => Animated.spring(value, {
        toValue: 1,
        tension: 62,
        friction: 8,
        useNativeDriver: true,
      }))
    );
    const ambient = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1500, useNativeDriver: true }),
    ]));
    entrance.start();
    ambient.start();
    return () => ambient.stop();
  }, [arrivals, pulse]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.communityGlow,
          {
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.5] }),
            transform: [{
              scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }),
            }],
          },
        ]}
      />
      {people.map((person, index) => {
        const animatedStyle = [
          styles.person,
          {
            left: person.x,
            top: person.y,
            width: person.size,
            height: person.size,
            borderRadius: person.size / 2,
            opacity: arrivals[index],
            transform: [
              {
                translateY: arrivals[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [28, 0],
                }),
              },
              {
                scale: arrivals[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.72, 1],
                }),
              },
            ],
          },
        ];

        if (person.generic) {
          return (
            <Animated.View key={index} style={animatedStyle}>
              <GenericUserAvatar size={person.size} />
            </Animated.View>
          );
        }

        return (
          <Animated.Image
            key={index}
            source={person.source as ImageSourcePropType}
            style={animatedStyle}
          />
        );
      })}
      <View style={styles.stage}>
        <View style={styles.stageCore} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: 280, height: 112, alignSelf: 'center', position: 'relative' },
  communityGlow: {
    position: 'absolute', left: 42, right: 42, bottom: 6, height: 62,
    borderRadius: 31, backgroundColor: '#47da8b',
  },
  person: {
    position: 'absolute', borderWidth: 2, borderColor: '#d9f7e5',
    backgroundColor: '#252a27', zIndex: 2,
  },
  stage: {
    position: 'absolute', left: 24, right: 24, bottom: 0, height: 23,
    borderTopLeftRadius: 90, borderTopRightRadius: 90, borderWidth: 1,
    borderColor: '#397758', backgroundColor: '#11241b',
  },
  stageCore: {
    alignSelf: 'center', width: 72, height: 4, marginTop: 8,
    borderRadius: 2, backgroundColor: '#52d990',
  },
});
