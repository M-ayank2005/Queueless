export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
};

export type CustomerTabParamList = {
  Home: undefined;
  ScanJoin: undefined;
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
};
