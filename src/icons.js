import React from "react";
import Svg, { Path, Rect, Circle, Line } from "react-native-svg";

export const Icon = {
  Mic: ({ size = 22, color = "#201e1d" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <Rect x="9" y="2" width="6" height="12" rx="3" />
      <Path d="M5 10a7 7 0 0 0 14 0M12 19v3" />
    </Svg>
  ),
  Camera: ({ size = 22, color = "#201e1d" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <Rect x="2" y="6" width="20" height="14" rx="1" />
      <Circle cx="12" cy="13" r="4" />
      <Path d="M8 6l1.5-2h5L16 6" />
    </Svg>
  ),
  Pencil: ({ size = 22, color = "#201e1d" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <Path d="M12 20h9" />
      <Path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </Svg>
  ),
  Search: ({ size = 16, color = "#201e1d" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <Circle cx="11" cy="11" r="8" />
      <Path d="m21 21-4.3-4.3" />
    </Svg>
  ),
  Box: ({ size = 16, color = "rgba(32,30,29,0.4)" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <Rect x="3" y="3" width="18" height="18" rx="1" />
      <Circle cx="8.5" cy="8.5" r="1.5" />
      <Path d="m21 15-5-5L5 21" />
    </Svg>
  ),
  Check: ({ size = 14, color = "#201e1d", strokeWidth = 2 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
      <Path d="M20 6L9 17l-5-5" />
    </Svg>
  ),
  Clock: ({ size = 20, color = "#201e1d" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 7v5l3 3" />
    </Svg>
  ),
  Family: ({ size = 20, color = "#201e1d" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <Path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
      <Circle cx="9" cy="7" r="4" />
      <Path d="M17 11a4 4 0 0 0 0-8M22 21v-2a4 4 0 0 0-3-3.87" />
    </Svg>
  ),
  Close: ({ size = 20, color = "#201e1d" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <Path d="M18 6 6 18M6 6l12 12" />
    </Svg>
  ),
  Back: ({ size = 20, color = "#201e1d" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <Path d="m15 18-6-6 6-6" />
    </Svg>
  ),
  Logo: ({ size = 22 }) => (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Path d="M8 22 L32 12 L56 22 L56 50 L8 50 Z" fill="none" stroke="#201e1d" strokeWidth="4" strokeLinejoin="round" />
      <Path d="M8 22 L32 32 L56 22" fill="none" stroke="#201e1d" strokeWidth="4" />
      <Circle cx="46" cy="20" r="10" fill="#ec3013" />
    </Svg>
  ),
};
