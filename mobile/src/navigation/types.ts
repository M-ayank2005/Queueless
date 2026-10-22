export type AuthStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
  PrivacyPolicy: undefined;
  Terms: undefined;
  HelpSupport: undefined;
};

export type CustomerTabParamList = {
  Home: undefined;
  Notifications: undefined;
  Updates: undefined;
  MyQueue: undefined;
  Profile: undefined;
};

export type BusinessTabParamList = {
  Dashboard: undefined;
  Notifications: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  CustomerTabs: undefined;
  BusinessTabs: undefined;
  ScanJoin: { qrCode?: string } | undefined;
  Profile: undefined;
  QueueStatus: { id: string };
  PrivacyPolicy: undefined;
  Terms: undefined;
  HelpSupport: undefined;
  BookingHistory: undefined;
};
