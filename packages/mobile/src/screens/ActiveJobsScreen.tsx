import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import type { ActiveJobsScreenProps } from '../types/navigation';
import { trpc } from '../utils/trpc';
import { TECHNICIAN_ID, JOB_STATUS, JOB_STATUS_COLORS, COLORS } from '../config/constants';

type JobStatus = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

interface Job {
  id: string;
  status: JobStatus;
  customerName: string;
  issueDescription: string;
  assignedAt: string | null;
  equipment: {
    id: string;
    serialNumber: string;
    make: string;
    model: string;
    engineHours: number;
    projectSite: string;
  };
  serviceRecord: {
    id: string;
    arrivedAt: string;
    revisedAt: string | null;
    revisionCount: number;
  } | null;
}

export function ActiveJobsScreen({ navigation }: ActiveJobsScreenProps): JSX.Element {
  const [refreshing, setRefreshing] = useState(false);

  const { data: activeJobs, isLoading: isLoadingActive, refetch: refetchActive } = trpc.job.listActive.useQuery({
    technicianId: TECHNICIAN_ID,
  });

  const { data: completedJobs, isLoading: isLoadingCompleted, refetch: refetchCompleted } = trpc.job.listCompleted.useQuery({
    technicianId: TECHNICIAN_ID,
  });

  const onRefresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    await Promise.all([refetchActive(), refetchCompleted()]);
    setRefreshing(false);
  }, [refetchActive, refetchCompleted]);

  const handleJobPress = (jobId: string): void => {
    navigation.navigate('JobDetail', { jobId });
  };

  const getStatusColor = (status: JobStatus): string => {
    return JOB_STATUS_COLORS[status] || '#6b7280';
  };

  const getStatusLabel = (status: JobStatus): string => {
    return JOB_STATUS[status] || status;
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Not assigned';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getEquipmentImage = (make: string, model: string) => {
    const key = `${make.toLowerCase()}_${model.toLowerCase()}`.replace(/\s+/g, '_');

    const imageMap: Record<string, any> = {
      'caterpillar_336_excavator': require('../../assets/equiptment/caterpillar_336_excavator.jpeg'),
      'caterpillar_d8t_dozer': require('../../assets/equiptment/caterpillar_d8t_dozer.jpeg'),
      'john_deere_850k_crawler_dozer': require('../../assets/equiptment/john_deere_850_crawler_dozer.jpeg'),
      'komatsu_pc490lc_excavator': require('../../assets/equiptment/komatsu_pc490_excavator.jpeg'),
      'volvo_ec380e_excavator': require('../../assets/equiptment/volvo_ec380e_excavator.jpeg'),
    };

    return imageMap[key] || null;
  };

  const renderJobCard = ({ item }: { item: Job }): JSX.Element => {
    const equipmentImage = getEquipmentImage(item.equipment.make, item.equipment.model);

    return (
      <TouchableOpacity
        style={styles.jobCard}
        onPress={() => handleJobPress(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          <View style={styles.equipmentThumbnail}>
            {equipmentImage ? (
              <Image
                source={equipmentImage}
                style={styles.equipmentImage}
                resizeMode="contain"
              />
            ) : (
              <Text style={styles.thumbnailPlaceholder}>🚜</Text>
            )}
          </View>

        <View style={styles.cardDetails}>
          <Text style={styles.equipmentText}>
            {item.equipment.make} {item.equipment.model}
          </Text>
          <Text style={styles.serialText}>{item.equipment.serialNumber}</Text>

          <Text style={styles.customerText}>{item.customerName}</Text>
          <Text style={styles.addressText} numberOfLines={1}>
            {item.equipment.projectSite}
          </Text>

          <View style={styles.badgeContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
            </View>
            {item.status === 'COMPLETED' && item.serviceRecord && item.serviceRecord.revisionCount > 0 && (
              <View style={styles.revisionBadge}>
                <Text style={styles.revisionText}>
                  Revised ({item.serviceRecord.revisionCount})
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: { title: string } }): JSX.Element => (
    <View style={[
      styles.sectionHeader,
      section.title === 'Completed Jobs' && styles.completedSectionHeader
    ]}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
    </View>
  );

  const renderEmptyState = (): JSX.Element => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No Jobs</Text>
      <Text style={styles.emptyText}>
        You don't have any jobs at the moment.
      </Text>
    </View>
  );

  const isLoading = isLoadingActive || isLoadingCompleted;
  const hasActiveJobs = (activeJobs?.length ?? 0) > 0;
  const hasCompletedJobs = (completedJobs?.length ?? 0) > 0;
  const hasAnyJobs = hasActiveJobs || hasCompletedJobs;

  if (isLoading && !activeJobs && !completedJobs) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY_YELLOW} />
        <Text style={styles.loadingText}>Loading jobs...</Text>
      </View>
    );
  }

  const sections = [
    ...(hasActiveJobs ? [{ title: '', data: (activeJobs || []) as Job[] }] : []),
    ...(hasCompletedJobs ? [{ title: 'Completed Jobs', data: (completedJobs || []) as Job[] }] : []),
  ];

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        renderItem={renderJobCard}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id}
        contentContainerStyle={!hasAnyJobs ? styles.emptyList : styles.list}
        ListEmptyComponent={renderEmptyState}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.PRIMARY_YELLOW]}
            tintColor={COLORS.PRIMARY_YELLOW}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_LIGHT,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND_LIGHT,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
  },
  list: {
    padding: 16,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  sectionHeader: {
    backgroundColor: COLORS.BACKGROUND_LIGHT,
    paddingTop: 8,
    paddingBottom: 12,
  },
  completedSectionHeader: {
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER_LIGHT,
    paddingTop: 24,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    alignItems: 'center',
    padding: 16,
  },
  jobCard: {
    backgroundColor: COLORS.BACKGROUND_LIGHT,
    borderRadius: 0,
    padding: 16,
    marginBottom: 16,
  },
  cardContent: {
    flexDirection: 'row',
    gap: 35,
  },
  equipmentThumbnail: {
    width: 80,
    height: 80,
    backgroundColor: 'transparent',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  equipmentImage: {
    width: 80,
    height: 80,
  },
  thumbnailPlaceholder: {
    fontSize: 40,
  },
  cardDetails: {
    flex: 1,
  },
  equipmentText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
  serialText: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  revisionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#f59e0b',
    alignSelf: 'flex-start',
  },
  revisionText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.BACKGROUND_LIGHT,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.BACKGROUND_LIGHT,
  },
  customerText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 6,
  },
  addressText: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 24,
  },
});
