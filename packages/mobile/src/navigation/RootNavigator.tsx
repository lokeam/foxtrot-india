import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { EquipmentListScreen } from '../screens/EquipmentListScreen';
import { EquipmentDetailScreen } from '../screens/EquipmentDetailScreen';
import { InspectionFormScreen } from '../screens/InspectionFormScreen';
import type { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="EquipmentList"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#3b82f6',
          },
          headerTintColor: '#ffffff',
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      >
        <Stack.Screen
          name="EquipmentList"
          component={EquipmentListScreen}
          options={{
            title: 'Fleet Equipment',
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
