import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { EquipmentListScreen } from '../screens/EquipmentListScreen';
import { EquipmentDetailScreen } from '../screens/EquipmentDetailScreen';
import { InspectionFormScreen } from '../screens/InspectionFormScreen';
import { ActiveJobsScreen } from '../screens/ActiveJobsScreen';
import { JobDetailScreen } from '../screens/JobDetailScreen';
import { CheckInScreen } from '../screens/CheckInScreen';
import { CompleteJobScreen } from '../screens/CompleteJobScreen';
import type { RootStackParamList } from '../types/navigation';
import { COLORS } from '../config/constants';
import { View, Platform, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const Stack = createNativeStackNavigator<RootStackParamList>();

function CustomHeader({ title }: { title: string }) {
  return (
    <SafeAreaView edges={['top']} style={customHeaderStyles.safeArea}>
      <View style={customHeaderStyles.container}>
        <Text style={customHeaderStyles.title}>{title}</Text>
      </View>
    </SafeAreaView>
  );
}

const customHeaderStyles = StyleSheet.create({
  safeArea: {
    backgroundColor: COLORS.BACKGROUND_LIGHT,
  },
  container: {
    backgroundColor: COLORS.BACKGROUND_LIGHT,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
});

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="ActiveJobs"
        screenOptions={{
          headerStyle: {
            backgroundColor: COLORS.BACKGROUND_LIGHT,
          },
          headerTintColor: COLORS.TEXT_PRIMARY,
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 24,
            ...(Platform.OS === 'ios' && { marginLeft: -20 }),
          },
          headerTitleAlign: 'left',
          headerShadowVisible: false,
          headerBackTitleVisible: false,
        }}
      >
        <Stack.Screen
          name="ActiveJobs"
          component={ActiveJobsScreen}
          options={{
            header: () => <CustomHeader title="Active Jobs" />,
          }}
        />
        <Stack.Screen
          name="JobDetail"
          component={JobDetailScreen}
          options={{
            title: 'Job Details',
          }}
        />
        <Stack.Screen
          name="CheckIn"
          component={CheckInScreen}
          options={{
            title: 'Check-In',
          }}
        />
        <Stack.Screen
          name="CompleteJob"
          component={CompleteJobScreen}
          options={{
            title: 'Complete Job',
          }}
        />
        <Stack.Screen
          name="EquipmentList"
          component={EquipmentListScreen}
          options={{
            header: () => <CustomHeader title="Fleet Equipment" />,
          }}
        />
        <Stack.Screen
          name="EquipmentDetail"
          component={EquipmentDetailScreen}
          options={{
            title: 'Equipment Details',
          }}
        />
        <Stack.Screen
          name="InspectionForm"
          component={InspectionFormScreen}
          options={{
            title: 'New Inspection',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
