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
import ErrorBoundary from '../components/ErrorBoundary';
import { reportCrash } from '../utils/crashReporter';

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

function makeOnError(screenName: string) {
  return (error: Error, info: { componentStack: string }) => {
    reportCrash({
      message: error.message,
      componentStack: info.componentStack,
      screenName,
      platform: Platform.OS,
    });
  };
}

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
          options={{
            header: () => <CustomHeader title="Active Jobs" />,
          }}
        >
          {(props) => (
            <ErrorBoundary
              resetKey={props.route.key}
              onError={makeOnError('ActiveJobsScreen')}
            >
              <ActiveJobsScreen {...props} />
            </ErrorBoundary>
          )}
        </Stack.Screen>
        <Stack.Screen
          name="JobDetail"
          options={{
            title: 'Job Details',
          }}
        >
          {(props) => (
            <ErrorBoundary
              resetKey={props.route.key}
              onError={makeOnError('JobDetailScreen')}
              onGoHome={() => props.navigation.navigate('ActiveJobs')}
            >
              <JobDetailScreen {...props} />
            </ErrorBoundary>
          )}
        </Stack.Screen>
        <Stack.Screen
          name="CheckIn"
          options={{
            title: 'Check-In',
          }}
        >
          {(props) => (
            <ErrorBoundary
              resetKey={props.route.key}
              onError={makeOnError('CheckInScreen')}
              onGoHome={() => props.navigation.navigate('ActiveJobs')}
            >
              <CheckInScreen {...props} />
            </ErrorBoundary>
          )}
        </Stack.Screen>
        <Stack.Screen
          name="CompleteJob"
          options={{
            title: 'Complete Job',
          }}
        >
          {(props) => (
            <ErrorBoundary
              resetKey={props.route.key}
              onError={makeOnError('CompleteJobScreen')}
              onGoHome={() => props.navigation.navigate('ActiveJobs')}
            >
              <CompleteJobScreen {...props} />
            </ErrorBoundary>
          )}
        </Stack.Screen>
        <Stack.Screen
          name="EquipmentList"
          options={{
            header: () => <CustomHeader title="Fleet Equipment" />,
          }}
        >
          {(props) => (
            <ErrorBoundary
              resetKey={props.route.key}
              onError={makeOnError('EquipmentListScreen')}
              onGoHome={() => props.navigation.navigate('ActiveJobs')}
            >
              <EquipmentListScreen {...props} />
            </ErrorBoundary>
          )}
        </Stack.Screen>
        <Stack.Screen
          name="EquipmentDetail"
          options={{
            title: 'Equipment Details',
          }}
        >
          {(props) => (
            <ErrorBoundary
              resetKey={props.route.key}
              onError={makeOnError('EquipmentDetailScreen')}
              onGoHome={() => props.navigation.navigate('ActiveJobs')}
            >
              <EquipmentDetailScreen {...props} />
            </ErrorBoundary>
          )}
        </Stack.Screen>
        <Stack.Screen
          name="InspectionForm"
          options={{
            title: 'New Inspection',
          }}
        >
          {(props) => (
            <ErrorBoundary
              resetKey={props.route.key}
              onError={makeOnError('InspectionFormScreen')}
              onGoHome={() => props.navigation.navigate('ActiveJobs')}
            >
              <InspectionFormScreen {...props} />
            </ErrorBoundary>
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
