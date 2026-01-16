import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { trpc } from '../utils/trpc';
import { EQUIPMENT_STATUS, EQUIPMENT_STATUS_COLORS } from '../config/constants';
import type { EquipmentListScreenProps } from '../types/navigation';

export function EquipmentListScreen({ navigation }: EquipmentListScreenProps) {
  const { data: equipment, isLoading, refetch, isRefetching } = trpc.equipment.list.useQuery();

  const handleEquipmentPress = (equipmentId: string) => {
    navigation.navigate('EquipmentDetail', { equipmentId });
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading equipment...</Text>
      </View>
    );
  }

  if (!equipment || equipment.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No equipment found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={equipment}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => handleEquipmentPress(item.id)}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.serialNumber}>{item.serialNumber}</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: EQUIPMENT_STATUS_COLORS[item.status] },
                ]}
              >
                <Text style={styles.statusText}>
                  {EQUIPMENT_STATUS[item.status]}
                </Text>
              </View>
            </View>
            <Text style={styles.makeModel}>
              {item.make} {item.model}
            </Text>
            <View style={styles.cardFooter}>
              <Text style={styles.detailText}>
                Engine Hours: {item.engineHours.toLocaleString()}
              </Text>
              {item.lastInspectionAt && (
                <Text style={styles.detailText}>
                  Last Inspection:{' '}
                  {new Date(item.lastInspectionAt).toLocaleDateString()}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serialNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  makeModel: {
    fontSize: 16,
    color: '#4b5563',
    marginBottom: 12,
  },
  cardFooter: {
    gap: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
  },
});
