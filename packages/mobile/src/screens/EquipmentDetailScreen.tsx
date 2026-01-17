import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../utils/trpc';
import { EQUIPMENT_STATUS, EQUIPMENT_STATUS_COLORS } from '../config/constants';
import type { EquipmentDetailScreenProps } from '../types/navigation';

export function EquipmentDetailScreen({
  route,
  navigation,
}: EquipmentDetailScreenProps) {
  const { equipmentId } = route.params;
  const { data: equipment, isLoading, refetch, isRefetching } = trpc.equipment.byId.useQuery({
    id: equipmentId,
  });

  const handleNewInspection = () => {
    navigation.navigate('InspectionForm', { equipmentId });
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading equipment details...</Text>
      </View>
    );
  }

  if (!equipment) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Equipment not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.serialNumber}>{equipment.serialNumber}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: EQUIPMENT_STATUS_COLORS[equipment.status] },
            ]}
          >
            <Text style={styles.statusText}>
              {EQUIPMENT_STATUS[equipment.status]}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Equipment Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Make:</Text>
            <Text style={styles.infoValue}>{equipment.make}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Model:</Text>
            <Text style={styles.infoValue}>{equipment.model}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Project Site:</Text>
            <Text style={styles.infoValue}>{equipment.projectSite}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Engine Hours:</Text>
            <Text style={styles.infoValue}>
              {equipment.engineHours.toLocaleString()}
            </Text>
          </View>
          {equipment.lastInspectionAt && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Inspection:</Text>
              <Text style={styles.infoValue}>
                {new Date(equipment.lastInspectionAt).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Recent Inspections ({equipment.inspections.length})
          </Text>
          {equipment.inspections.length === 0 ? (
            <Text style={styles.emptyText}>No inspections yet</Text>
          ) : (
            equipment.inspections.map((inspection) => (
              <View key={inspection.id} style={styles.inspectionCard}>
                <View style={styles.inspectionHeader}>
                  <Text style={styles.inspectionDate}>
                    {new Date(inspection.timestamp).toLocaleDateString()}
                  </Text>
                  <View
                    style={[
                      styles.inspectionStatusBadge,
                      { backgroundColor: EQUIPMENT_STATUS_COLORS[inspection.status] },
                    ]}
                  >
                    <Text style={styles.inspectionStatusText}>
                      {EQUIPMENT_STATUS[inspection.status]}
                    </Text>
                  </View>
                </View>
                <Text style={styles.inspectionInspector}>
                  Inspector: {inspection.inspectorName}
                </Text>
                <Text style={styles.inspectionHours}>
                  Engine Hours: {inspection.engineHours.toLocaleString()}
                </Text>
                {inspection.notes && (
                  <Text style={styles.inspectionNotes}>{inspection.notes}</Text>
                )}
                {inspection.photoUrls.length > 0 && (
                  <View style={styles.inspectionPhotos}>
                    <Ionicons name="camera" size={14} color="#6b7280" />
                    <Text style={styles.inspectionPhotosText}>
                      {inspection.photoUrls.length} photo(s)
                    </Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.newInspectionButton}
        onPress={handleNewInspection}
        activeOpacity={0.8}
      >
        <Text style={styles.newInspectionButtonText}>+ New Inspection</Text>
      </TouchableOpacity>
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
  errorText: {
    fontSize: 16,
    color: '#ef4444',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  serialNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  section: {
    backgroundColor: '#ffffff',
    marginTop: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: {
    fontSize: 16,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  inspectionCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  inspectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inspectionDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  inspectionStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  inspectionStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  inspectionInspector: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  inspectionHours: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  inspectionNotes: {
    fontSize: 14,
    color: '#4b5563',
    marginTop: 8,
    fontStyle: 'italic',
  },
  inspectionPhotos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  inspectionPhotosText: {
    fontSize: 14,
    color: '#6b7280',
  },
  newInspectionButton: {
    backgroundColor: '#3b82f6',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  newInspectionButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
});
