import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const Header = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>challengesphere</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#F8F7FC',
    borderBottomWidth: 1,
    borderBottomColor: '#141414',
  },
  title: {
    fontSize: 21,
    fontWeight: '700',
    color: '#18142F',
    letterSpacing: -0.5,
  },
});

export default Header;
