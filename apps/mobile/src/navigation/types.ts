import type { ProductDetectionDraft } from '../services/productDetection';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  Auth: { email?: string; mode?: 'login' | 'signup' } | undefined;
  OTP: { email: string; mode?: 'login' | 'signup' };
  Onboarding: undefined;
  Main: undefined;
  Scanner: undefined;
  AddBatch: { barcode?: string; aiDetection?: ProductDetectionDraft | null };
  BatchDetail: { id: string };
  ConsumeWaste: { id: string };
  EditBatch: { id: string };
  HouseholdSettings: undefined;
  History: undefined;
};

export type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;
