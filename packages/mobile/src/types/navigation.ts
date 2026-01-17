import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  EquipmentList: undefined;
  EquipmentDetail: { equipmentId: string };
  InspectionForm: { equipmentId: string };
  ActiveJobs: undefined;
  JobDetail: { jobId: string };
  CheckIn: { jobId: string; equipmentId: string; serviceRecordId?: string };
  CompleteJob: { jobId: string; serviceRecordId: string; isEditMode?: boolean };
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

export type ActiveJobsScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'ActiveJobs'
>;

export type JobDetailScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'JobDetail'
>;

export type CheckInScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'CheckIn'
>;

export type CompleteJobScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'CompleteJob'
>;
