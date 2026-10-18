export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  PrivacyPolicy: undefined;
  Terms: undefined;
  HelpSupport: undefined;
};

export type CustomerTabParamList = {
  Home: undefined;
  ScanJoin: { qrCode?: string } | undefined;
  Profile: undefined;
};

export type BusinessTabParamList = {
  Dashboard: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  CustomerTabs: undefined;
  BusinessTabs: undefined;
  QueueStatus: { id: string };
  PrivacyPolicy: undefined;
  Terms: undefined;
  HelpSupport: undefined;
};
