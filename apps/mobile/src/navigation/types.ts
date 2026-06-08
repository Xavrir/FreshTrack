import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Auth: undefined;
  OTP: { email: string };
  Onboarding: undefined;
  Main: undefined;
  Scanner: undefined;
  AddBatch: { barcode?: string };
  EditBatch: { id: string };
  BatchDetail: { id: string };
  ConsumeWaste: { 
    id: string;
    type: 'consume' | 'waste';
   };
  HouseholdSettings: undefined;
  History: undefined;
};

export type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;
