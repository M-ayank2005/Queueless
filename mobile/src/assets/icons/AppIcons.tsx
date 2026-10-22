import React from 'react';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';
import { LogoQ } from '../../components/LogoQ';

interface IconProps {
  size?: number;
  color?: string;
  focused?: boolean;
}

// 1. Home Icon
export const HomeIcon: React.FC<IconProps> = ({ size = 24, color = '#284D83', focused = false }) => {
  if (focused) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M10 20V14H14V20H19V12H22L12 3L2 12H5V20H10Z"
          fill={color}
        />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 10.182V20C3 20.5523 3.44772 21 4 21H9C9.55228 21 10 20.5523 10 20V15C10 14.4477 10.4477 14 11 14H13C13.5523 14 14 14.4477 14 15V20C14 20.5523 14.4477 21 15 21H20C20.5523 21 21 20.5523 21 20V10.182C21 9.69748 20.8247 9.22941 20.5058 8.86175L12.5058 1.86175C12.2224 1.53488 11.7776 1.53488 11.4942 1.86175L3.49416 8.86175C3.17527 9.22941 3 9.69748 3 10.182Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

// 2. Bell / Notification Icon
export const BellIcon: React.FC<IconProps> = ({ size = 24, color = '#284D83', focused = false }) => {
  if (focused) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22ZM18 16V11C18 7.93 16.37 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.64 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16Z"
          fill={color}
        />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

// 3. Megaphone / Updates Icon
export const MegaphoneIcon: React.FC<IconProps> = ({ size = 24, color = '#284D83', focused = false }) => {
  if (focused) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M21 4V14C21 14.55 20.55 15 20 15H17.41L13.71 18.71C13.32 19.1 12.65 18.82 12.65 18.27V15H10.5C9.67 15 9 14.33 9 13.5V5.5C9 4.67 9.67 4 10.5 4H20C20.55 4 21 4.45 21 4ZM5 7C3.9 7 3 7.9 3 9V11C3 12.1 3.9 13 5 13V18C5 18.55 5.45 19 6 19H7C7.55 19 8 18.55 8 18V13H8.5V7H5Z"
          fill={color}
        />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8C19.6569 8 21 9.34315 21 11C21 12.6569 19.6569 14 18 14M18 8H9L4 5V17L9 14H18C19.6569 14 21 12.6569 21 11C21 9.34315 19.6569 8 18 8ZM9 14V19C9 19.5523 8.55228 20 8 20H7C6.44772 20 6 19.5523 6 19V15.8"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

// 4. Tab Q Icon (My Queue) — Authentic QueueLess Logo
export const QueueTabIcon: React.FC<IconProps> = ({ size = 26, color = '#284D83', focused = false }) => {
  return <LogoQ size={size} color={color} fill={focused} variant="monochrome" />;
};

// 5. Grid / Dashboard Icon
export const GridIcon: React.FC<IconProps> = ({ size = 24, color = '#284D83', focused = false }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3"
        y="3"
        width="7"
        height="7"
        rx="2"
        fill={focused ? color : 'none'}
        stroke={color}
        strokeWidth={1.8}
      />
      <Rect
        x="14"
        y="3"
        width="7"
        height="7"
        rx="2"
        fill={focused ? color : 'none'}
        stroke={color}
        strokeWidth={1.8}
      />
      <Rect
        x="3"
        y="14"
        width="7"
        height="7"
        rx="2"
        fill={focused ? color : 'none'}
        stroke={color}
        strokeWidth={1.8}
      />
      <Rect
        x="14"
        y="14"
        width="7"
        height="7"
        rx="2"
        fill={focused ? color : 'none'}
        stroke={color}
        strokeWidth={1.8}
      />
    </Svg>
  );
};

// 6. Person / Profile Icon
export const PersonIcon: React.FC<IconProps> = ({ size = 24, color = '#284D83', focused = false }) => {
  if (focused) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"
          fill={color}
        />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle
        cx="12"
        cy="7"
        r="4"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

// 7. QR Scanner Icon
export const QrCodeIcon: React.FC<{ size?: number; color?: string }> = ({ size = 24, color = '#FFFFFF' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth={1.8} />
      <Rect x="5" y="5" width="3" height="3" fill={color} />
      <Rect x="14" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth={1.8} />
      <Rect x="16" y="5" width="3" height="3" fill={color} />
      <Rect x="3" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth={1.8} />
      <Rect x="5" y="16" width="3" height="3" fill={color} />
      <Path d="M14 14H17V17H14V14Z" fill={color} />
      <Path d="M19 14H21V16H19V14Z" fill={color} />
      <Path d="M14 19H16V21H14V19Z" fill={color} />
      <Path d="M19 19H21V21H19V19Z" fill={color} />
    </Svg>
  );
};

// 8. Clock Icon
export const ClockIcon: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = '#858585' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.8} />
      <Path d="M12 7V12L15.5 14" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
};

// 9. Pin Icon
export const PinIcon: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = '#858585' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21C16 16.5 19 13.14 19 9.5C19 5.36 15.87 2 12 2C8.13 2 5 5.36 5 9.5C5 13.14 8 16.5 12 21Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="9.5" r="2.5" stroke={color} strokeWidth={1.8} />
    </Svg>
  );
};

// 10. Hourglass Icon
export const HourglassIcon: React.FC<{ size?: number; color?: string }> = ({ size = 24, color = '#FC0015' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 2H19M5 22H19M7 2L12 12M17 2L12 12M12 12L7 22M12 12L17 22"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

// 11. Check Circle Icon
export const CheckCircleIcon: React.FC<{ size?: number; color?: string }> = ({ size = 24, color = '#347F4F' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" fill={color} />
      <Path d="M8 12.5L10.5 15L16 9.5" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

// 12. Heart Icon
export const HeartIcon: React.FC<{ size?: number; color?: string; filled?: boolean }> = ({
  size = 20,
  color = '#FC0015',
  filled = false,
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20.84 4.61C20.3292 4.099 19.7228 3.69364 19.0554 3.41708C18.3879 3.14052 17.6725 2.99817 16.95 2.99817C16.2275 2.99817 15.5121 3.14052 14.8446 3.41708C14.1772 3.69364 13.5708 4.099 13.06 4.61L12 5.67L10.94 4.61C9.9083 3.5783 8.50903 2.9987 7.05 2.9987C5.59096 2.9987 4.19169 3.5783 3.16 4.61C2.1283 5.6417 1.54871 7.04097 1.54871 8.5C1.54871 9.95903 2.1283 11.3583 3.16 12.39L4.22 13.45L12 21.23L19.78 13.45L20.84 12.39C21.351 11.8792 21.7563 11.2728 22.0329 10.6053C22.3095 9.93789 22.4518 9.22248 22.4518 8.5C22.4518 7.77752 22.3095 7.06211 22.0329 6.39467C21.7563 5.72723 21.351 5.1208 20.84 4.61Z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

// 13. Eye & EyeOff Icons
export const EyeIcon: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = '#1A1A1A' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={1.8} />
    </Svg>
  );
};

export const EyeOffIcon: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = '#1A1A1A' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17.94 17.94A10.07 10.07 0 0112 20C5 20 1 12 1 12A20.35 20.35 0 015.06 6.06M9.9 4.24A9.12 9.12 0 0112 4C19 4 23 12 23 12A20.36 20.36 0 0119.74 16.74M14.12 14.12A3 3 0 119.88 9.88M1 1L23 23"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

// 14. Chevron Icons
export const ChevronBackIcon: React.FC<{ size?: number; color?: string }> = ({ size = 24, color = '#000000' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18L9 12L15 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

export const ChevronRightIcon: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = '#858585' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18L15 12L9 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

// 15. Sale / Offer Scalloped Badge Icon
export const OfferBadgeIcon: React.FC<{ size?: number; color?: string }> = ({ size = 24, color = '#2E7D32' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2L14.78 4.07L18.17 3.42L19.46 6.64L22.61 8.08L22.07 11.52L23.86 14.5L21.46 16.99L21.6 20.45L18.19 21.05L16.03 23.77L12.82 22.45L9.61 23.77L7.45 21.05L4.04 20.45L4.18 16.99L1.78 14.5L3.57 11.52L3.03 8.08L6.18 6.64L7.47 3.42L10.86 4.07L12 2Z"
        fill={color}
      />
      <Path d="M9 9L15 15M10 14.5C10 15.33 9.33 16 8.5 16C7.67 16 7 15.33 7 14.5C7 13.67 7.67 13 8.5 13C9.33 13 10 13.67 10 14.5ZM17 9.5C17 10.33 16.33 11 15.5 11C14.67 11 14 10.33 14 9.5C14 8.67 14.67 8 15.5 8C16.33 8 17 8.67 17 9.5Z" stroke="#FFFFFF" strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
};
