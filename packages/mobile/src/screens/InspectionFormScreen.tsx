import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { InspectionFormScreenProps } from '../types/navigation';

export function InspectionFormScreen({ route }: InspectionFormScreenProps) {
  const { equipmentId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Inspection Form</Text>
      <Text style={styles.subText}>Equipment ID: {equipmentId}</Text>
      <Text style={styles.note}>
        This screen will be implemented in Phase 3
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 20,
  },
  text: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  subText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 20,
  },
  note: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
