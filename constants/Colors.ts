/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

export const VioletColors = {
  primary: '#4700EC',
  accent: '#6C42E8',
  surface: '#F0ECFF',
  border: '#DDD4FF',
  soft: '#7B55E7',
  text: '#5B3FE5',
  onPrimary: '#F8FAFC',
} as const;

const tintColorLight = '#4700EC';
const tintColorDark = '#BDA7FF';

export const Colors = {
  light: {
    text: '#18142F',
    background: '#F8F7FC',
    tint: tintColorLight,
    icon: '#777389',
    tabIconDefault: '#8F8996',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#18142F',
    background: '#F8F7FC',
    tint: tintColorDark,
    icon: '#777389',
    tabIconDefault: '#8F8996',
    tabIconSelected: tintColorDark,
  },
};
