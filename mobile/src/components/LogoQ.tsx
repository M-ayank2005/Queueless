import React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  G,
  Path,
  Circle,
  Line,
} from 'react-native-svg';

interface LogoQProps {
  size?: number;
  color?: string;
  variant?: 'brand' | 'monochrome';
  fill?: boolean;
  strokeWidth?: number;
  opacity?: number;
}

/**
 * Authoritative QueueLess Brand Logo
 * Extracted directly from frontend/public/logo_icon.svg
 */
export const LogoQ: React.FC<LogoQProps> = ({
  size = 86,
  color,
  variant = 'brand',
  fill,
  opacity = 1,
}) => {
  // If a specific color is provided and variant is not explicitly 'brand', use monochrome
  const isMonochrome = variant === 'monochrome' || Boolean(color && variant !== 'brand');
  const monoColor = color || '#FFFFFF';

  if (isMonochrome) {
    return (
      <Svg width={size} height={size} viewBox="0 0 512 512" fill="none" opacity={opacity}>
        <G>
          {/* Major Q Body */}
          <Path
            d="
              M 235 70
              C 138 70 60 148 60 245
              C 60 342 138 420 235 420
              C 285 420 330 399 362 365
              C 335 345 305 320 285 300
              C 270 315 253 325 235 325
              C 191 325 155 289 155 245
              C 155 201 191 165 235 165
              C 279 165 315 201 315 245
              C 315 260 310 274 302 286
              C 324 300 355 325 385 345
              C 401 316 410 282 410 245
              C 410 148 332 70 235 70 Z"
            fill={fill ? monoColor : 'none'}
            stroke={monoColor}
            strokeWidth={fill ? 0 : 20}
          />

          {/* Surge Arrow */}
          <Path
            d="
              M 245 325
              C 290 325 330 345 365 375
              C 395 345 425 295 455 220
              L 460 255
              L 475 190
              L 410 205
              L 435 220
              C 405 280 375 320 345 340
              C 315 315 275 290 245 290
              Z"
            fill={monoColor}
          />

          {/* Center Beacon */}
          <Circle cx="235" cy="245" r="16" fill={monoColor} />
        </G>
      </Svg>
    );
  }

  // Authentic Full Brand Logo with Radials & Multi-Stop Gradients
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512" fill="none" opacity={opacity}>
      <Defs>
        <LinearGradient id="q-outer-grad" x1="60" y1="60" x2="420" y2="420" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#38BDF8" />
          <Stop offset="45%" stopColor="#2563EB" />
          <Stop offset="100%" stopColor="#4F46E5" />
        </LinearGradient>

        <LinearGradient id="q-inner-grad" x1="120" y1="100" x2="360" y2="380" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#BAE6FD" />
          <Stop offset="35%" stopColor="#38BDF8" />
          <Stop offset="70%" stopColor="#1D4ED8" />
          <Stop offset="100%" stopColor="#0F172A" />
        </LinearGradient>

        <LinearGradient id="arrow-grad" x1="220" y1="360" x2="450" y2="180" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#38BDF8" />
          <Stop offset="50%" stopColor="#60A5FA" />
          <Stop offset="100%" stopColor="#E0F2FE" />
        </LinearGradient>

        <LinearGradient id="stream-grad" x1="300" y1="340" x2="420" y2="200" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#2563EB" stopOpacity="0.2" />
          <Stop offset="60%" stopColor="#38BDF8" stopOpacity="0.8" />
          <Stop offset="100%" stopColor="#93C5FD" />
        </LinearGradient>

        <RadialGradient id="center-radar" cx="230" cy="240" r="140" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#38BDF8" stopOpacity="0.35" />
          <Stop offset="60%" stopColor="#1D4ED8" stopOpacity="0.1" />
          <Stop offset="100%" stopColor="#020617" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* Ambient Radar Aura */}
      <Circle cx="235" cy="245" r="130" fill="url(#center-radar)" />

      {/* Radar Target Rings */}
      <G opacity={0.45} stroke="#38BDF8" strokeWidth={3} strokeDasharray="6 8">
        <Circle cx="235" cy="245" r="95" />
        <Circle cx="235" cy="245" r="65" />
      </G>

      {/* Crosshairs */}
      <G opacity={0.35} stroke="#7DD3FC" strokeWidth={2.5} strokeLinecap="round">
        <Line x1="235" y1="130" x2="235" y2="170" />
        <Line x1="235" y1="320" x2="235" y2="360" />
        <Line x1="120" y1="245" x2="160" y2="245" />
        <Line x1="310" y1="245" x2="350" y2="245" />
      </G>

      {/* Central Real-Time Pulse Beacon */}
      <Circle cx="235" cy="245" r="24" fill="#0284C7" opacity={0.35} />
      <Circle cx="235" cy="245" r="14" fill="#38BDF8" />
      <Circle cx="235" cy="245" r="7" fill="#FFFFFF" />

      {/* Stream Speed Flares */}
      <Path
        d="M 330 190 C 375 195 405 170 425 140 C 410 175 375 220 320 230 Z"
        fill="url(#stream-grad)"
        opacity={0.8}
      />
      <Path
        d="M 360 250 C 405 240 435 210 445 180 C 435 220 395 265 345 280 Z"
        fill="url(#stream-grad)"
        opacity={0.9}
      />

      {/* The Major "Q" Body Structure */}
      <Path
        d="
          M 235 70
          C 138 70 60 148 60 245
          C 60 342 138 420 235 420
          C 285 420 330 399 362 365
          C 335 345 305 320 285 300
          C 270 315 253 325 235 325
          C 191 325 155 289 155 245
          C 155 201 191 165 235 165
          C 279 165 315 201 315 245
          C 315 260 310 274 302 286
          C 324 300 355 325 385 345
          C 401 316 410 282 410 245
          C 410 148 332 70 235 70 Z"
        fill="url(#q-outer-grad)"
      />

      {/* Top Inner Gloss Highlight Curve */}
      <Path
        d="
          M 235 90
          C 150 90 85 155 85 240
          C 85 285 105 325 138 352
          C 120 320 110 282 110 242
          C 110 172 165 116 235 116
          C 285 116 328 145 350 188
          C 332 135 288 90 235 90 Z"
        fill="url(#q-inner-grad)"
        opacity={0.85}
      />

      {/* The "Less" Dynamic Escape / Fast-Forward Surge Arrow */}
      <Path
        d="
          M 245 325
          C 290 325 330 345 365 375
          C 395 345 425 295 455 220
          L 460 255
          L 475 190
          L 410 205
          L 435 220
          C 405 280 375 320 345 340
          C 315 315 275 290 245 290
          Z"
        fill="url(#arrow-grad)"
      />

      {/* Bright Accent Spark on the Arrow Tip */}
      <Circle cx="475" cy="190" r="5" fill="#FFFFFF" />
    </Svg>
  );
};

export default LogoQ;
