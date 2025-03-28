export type RootStackParamList = {
  '(auth)': undefined;
  '(main)': undefined;
};

export type AuthStackParamList = {
  login: undefined;
  register: undefined;
  'forgot-password': undefined;
};

export type MainTabParamList = {
  index: undefined;
  friends: undefined;
  profile: undefined;
  settings: undefined;
};

export type ChatStackParamList = {
  '[id]': { id: string };
  create: undefined;
}; 