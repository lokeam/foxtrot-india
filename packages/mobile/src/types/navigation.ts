import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  EquipmentList: undefined;
  EquipmentDetail: { equipmentId: string };
  InspectionForm: { equipmentId: string };
};

export type EquipmentListScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'EquipmentList'
>;

export type EquipmentDetailScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'EquipmentDetail'
>;

export type InspectionFormScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'InspectionForm'
>;
