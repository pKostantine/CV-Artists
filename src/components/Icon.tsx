import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName =
  | 'document-outline'
  | 'globe-outline'
  | 'lyrics-outline'
  | 'person-outline'
  | 'chevron-back'
  | 'chevron-forward'
  | 'chevron-down'
  | 'log-out-outline'
  | 'refresh-outline'
  | 'add'
  | 'trash-outline'
  | 'play'
  | 'pause'
  | 'close'
  | 'checkmark';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/** Inline Ionicons glyphs, the same set the main Coptic Vine app vendors. */
export default function Icon({ name, size = 24, color = '#000', style }: IconProps) {
  switch (name) {
    case 'document-outline':
      return (
        <Svg width={size} height={size} viewBox="0 0 512 512" style={style}>
          <Path d="M160 48h144l96 96v304a32 32 0 0 1-32 32H160a48 48 0 0 1-48-48V96a48 48 0 0 1 48-48Z" fill="none" stroke={color} strokeWidth={32} strokeLinejoin="round" />
          <Path d="M304 48v112h112M192 240h128M192 320h128M192 400h80" fill="none" stroke={color} strokeWidth={32} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'globe-outline':
      return (
        <Svg width={size} height={size} viewBox="0 0 512 512" style={style}>
          <Circle cx={256} cy={256} r={192} fill="none" stroke={color} strokeWidth={32} />
          <Path d="M64 256h384M256 64c56 52 88 120 88 192s-32 140-88 192c-56-52-88-120-88-192s32-140 88-192Z" fill="none" stroke={color} strokeWidth={32} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'lyrics-outline':
      return (
        <Svg width={size} height={size} viewBox="0 0 512 512" style={style}>
          <Path d="M64 128h160M64 224h160M64 320h112" fill="none" stroke={color} strokeWidth={32} strokeLinecap="round" />
          <Path d="M288 112v232M288 128l160-32v216" fill="none" stroke={color} strokeWidth={32} strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx={232} cy={360} r={56} fill="none" stroke={color} strokeWidth={32} />
          <Circle cx={392} cy={328} r={56} fill="none" stroke={color} strokeWidth={32} />
        </Svg>
      );
    case 'person-outline':
      return (
        <Svg width={size} height={size} viewBox="0 0 512 512" style={style}>
          <Circle cx={256} cy={144} r={96} fill="none" stroke={color} strokeWidth={32} />
          <Path d="M80 464c0-97.2 78.8-176 176-176s176 78.8 176 176" fill="none" stroke={color} strokeWidth={32} strokeLinecap="round" />
        </Svg>
      );
    case 'chevron-back':
      return (
        <Svg width={size} height={size} viewBox="0 0 512 512" style={style}>
          <Path d="M328 112 184 256l144 144" fill="none" stroke={color} strokeWidth={48} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'chevron-forward':
      return (
        <Svg width={size} height={size} viewBox="0 0 512 512" style={style}>
          <Path d="m184 112 144 144-144 144" fill="none" stroke={color} strokeWidth={48} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'chevron-down':
      return (
        <Svg width={size} height={size} viewBox="0 0 512 512" style={style}>
          <Path d="m112 184 144 144 144-144" fill="none" stroke={color} strokeWidth={48} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'log-out-outline':
      return (
        <Svg width={size} height={size} viewBox="0 0 512 512" style={style}>
          <Path d="M304 336v40a40 40 0 0 1-40 40H104a40 40 0 0 1-40-40V136a40 40 0 0 1 40-40h152c22.09 0 48 17.91 48 40v40M368 336l80-80-80-80M176 256h256" fill="none" stroke={color} strokeWidth={32} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'refresh-outline':
      return (
        <Svg width={size} height={size} viewBox="0 0 512 512" style={style}>
          <Path d="M320 146s24.36-12-64-12a160 160 0 1 0 160 160" fill="none" stroke={color} strokeWidth={32} strokeLinecap="round" strokeMiterlimit={10} />
          <Path d="m256 58 80 80-80 80" fill="none" stroke={color} strokeWidth={32} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'add':
      return (
        <Svg width={size} height={size} viewBox="0 0 512 512" style={style}>
          <Path d="M256 112v288M400 256H112" fill="none" stroke={color} strokeWidth={32} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'trash-outline':
      return (
        <Svg width={size} height={size} viewBox="0 0 512 512" style={style}>
          <Path d="M112 112h288M208 112V72h96v40M144 112l24 336h176l24-336M224 192v176M288 192v176" fill="none" stroke={color} strokeWidth={32} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'play':
      return (
        <Svg width={size} height={size} viewBox="0 0 512 512" style={style}>
          <Path d="M133 440a35.37 35.37 0 0 1-17.5-4.67c-12-6.8-19.46-20-19.46-34.33V111c0-14.37 7.46-27.53 19.46-34.33a35.13 35.13 0 0 1 35.77.45l247.85 148.36a36 36 0 0 1 0 61l-247.89 148.4A35.5 35.5 0 0 1 133 440z" fill={color} />
        </Svg>
      );
    case 'pause':
      return (
        <Svg width={size} height={size} viewBox="0 0 512 512" style={style}>
          <Rect x={136} y={80} width={80} height={352} rx={22} fill={color} />
          <Rect x={296} y={80} width={80} height={352} rx={22} fill={color} />
        </Svg>
      );
    case 'close':
      return (
        <Svg width={size} height={size} viewBox="0 0 512 512" style={style}>
          <Path d="M368 368 144 144M368 144 144 368" fill="none" stroke={color} strokeWidth={40} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'checkmark':
      return (
        <Svg width={size} height={size} viewBox="0 0 512 512" style={style}>
          <Path d="M416 128 176 384l-80-80" fill="none" stroke={color} strokeWidth={44} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    default:
      return null;
  }
}
