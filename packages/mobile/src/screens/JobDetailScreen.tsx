import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
  Linking,
  Platform,
} from 'react-native';
import ImageView from 'react-native-image-viewing';
import { Ionicons } from '@expo/vector-icons';
import type { JobDetailScreenProps } from '../types/navigation';
import { trpc } from '../utils/trpc';
import { JOB_STATUS, JOB_STATUS_COLORS, COLORS } from '../config/constants';

type JobStatus = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

const SCREEN_WIDTH = Dimensions.get('window').width;
const THUMBNAIL_SIZE = (SCREEN_WIDTH - 64) / 4;

export function JobDetailScreen({ route, navigation }: JobDetailScreenProps): JSX.Element {
  const { jobId } = route.params;
  const [beforeImageViewerVisible, setBeforeImageViewerVisible] = useState(false);
  const [beforeImageViewerIndex, setBeforeImageViewerIndex] = useState(0);
  const [afterImageViewerVisible, setAfterImageViewerVisible] = useState(false);
  const [afterImageViewerIndex, setAfterImageViewerIndex] = useState(0);
  const [contactInfoExpanded, setContactInfoExpanded] = useState(false);

  const { data: job, isLoading, error, refetch } = trpc.job.byId.useQuery({ jobId });
  const deleteBeforePhotoMutation = trpc.serviceRecord.deleteBeforePhoto.useMutation();
  const deleteAfterPhotoMutation = trpc.serviceRecord.deleteAfterPhoto.useMutation();

  const handleStartCheckIn = (): void => {
    if (!job) return;
    navigation.navigate('CheckIn', { jobId: job.id, equipmentId: job.equipment.id });
  };

  const handleEditCheckIn = (): void => {
    if (!job?.serviceRecord) return;
    navigation.navigate('CheckIn', {
      jobId: job.id,
      equipmentId: job.equipment.id,
      serviceRecordId: job.serviceRecord.id,
    });
  };

  const handleEditCompletion = (): void => {
    if (!job?.serviceRecord) return;
    navigation.navigate('CompleteJob', {
      jobId: job.id,
      serviceRecordId: job.serviceRecord.id,
      isEditMode: true,
    });
  };

  const handleCompleteJob = (): void => {
    if (!job?.serviceRecord) {
      Alert.alert('Error', 'Service record not found. Please check in first.');
      return;
    }
    navigation.navigate('CompleteJob', {
      jobId: job.id,
      serviceRecordId: job.serviceRecord.id,
    });
  };

  const handlePhonePress = (phone: string): void => {
    Alert.alert(
      'Contact',
      `Call ${phone}?`,
      [
        {
          text: 'Call',
          onPress: () => {
            const phoneUrl = `tel:${phone.replace(/[^0-9]/g, '')}`;
            Linking.canOpenURL(phoneUrl)
              .then((supported) => {
                if (supported) {
                  return Linking.openURL(phoneUrl);
                } else {
                  Alert.alert('Error', 'Phone calls are not supported on this device');
                }
              })
              .catch(() => Alert.alert('Error', 'Failed to open phone dialer'));
          },
        },
        {
          text: 'Text',
          onPress: () => {
            const smsUrl = `sms:${phone.replace(/[^0-9]/g, '')}`;
            Linking.canOpenURL(smsUrl)
              .then((supported) => {
                if (supported) {
                  return Linking.openURL(smsUrl);
                } else {
                  Alert.alert('Error', 'SMS is not supported on this device');
                }
              })
              .catch(() => Alert.alert('Error', 'Failed to open messaging app'));
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleEmailPress = (email: string): void => {
    const emailUrl = `mailto:${email}`;
    Linking.canOpenURL(emailUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(emailUrl);
        } else {
          Alert.alert('Error', 'Email is not supported on this device');
        }
      })
      .catch(() => Alert.alert('Error', 'Failed to open email app'));
  };

  const handleAddressPress = (address: string): void => {
    const encodedAddress = encodeURIComponent(address);
    const mapsUrl = Platform.select({
      ios: `maps:0,0?q=${encodedAddress}`,
      android: `geo:0,0?q=${encodedAddress}`,
    });

    if (mapsUrl) {
      Linking.canOpenURL(mapsUrl)
        .then((supported) => {
          if (supported) {
            return Linking.openURL(mapsUrl);
          } else {
            Alert.alert('Error', 'Maps is not supported on this device');
          }
        })
        .catch(() => Alert.alert('Error', 'Failed to open maps'));
    }
  };

  const handleNavigate = (address: string): void => {
    const encodedAddress = encodeURIComponent(address);
    const mapsUrl = Platform.select({
      ios: `maps:0,0?q=${encodedAddress}`,
      android: `geo:0,0?q=${encodedAddress}`,
    });

    if (mapsUrl) {
      Linking.openURL(mapsUrl).catch(() => {
        Alert.alert('Error', 'Failed to open navigation');
      });
    }
  };

  const handleBeforeThumbnailPress = (index: number): void => {
    setBeforeImageViewerIndex(index);
    setBeforeImageViewerVisible(true);
  };

  const handleAfterThumbnailPress = (index: number): void => {
    setAfterImageViewerIndex(index);
    setAfterImageViewerVisible(true);
  };

  const handleDeleteBeforePhoto = async (): Promise<void> => {
    if (!job?.serviceRecord) return;

    const photoToDelete = job.serviceRecord.beforePhotos[beforeImageViewerIndex];

    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBeforePhotoMutation.mutateAsync({
                serviceRecordId: job.serviceRecord!.id,
                photoUrl: photoToDelete,
              });

              await refetch();

              if (job.serviceRecord.beforePhotos.length === 1) {
                setBeforeImageViewerVisible(false);
              } else if (beforeImageViewerIndex >= job.serviceRecord.beforePhotos.length - 1) {
                setBeforeImageViewerIndex(Math.max(0, beforeImageViewerIndex - 1));
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to delete photo. Please try again.');
            }
          },
        },
      ],
    );
  };

  const handleDeleteAfterPhoto = async (): Promise<void> => {
    if (!job?.serviceRecord) return;

    const photoToDelete = job.serviceRecord.afterPhotos[afterImageViewerIndex];

    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAfterPhotoMutation.mutateAsync({
                serviceRecordId: job.serviceRecord!.id,
                photoUrl: photoToDelete,
              });

              await refetch();

              if (job.serviceRecord.afterPhotos.length === 1) {
                setAfterImageViewerVisible(false);
              } else if (afterImageViewerIndex >= job.serviceRecord.afterPhotos.length - 1) {
                setAfterImageViewerIndex(Math.max(0, afterImageViewerIndex - 1));
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to delete photo. Please try again.');
            }
          },
        },
      ],
    );
  };

  const renderBeforeImageViewerFooter = (currentIndex: number): JSX.Element => {
    const totalPhotos = job?.serviceRecord?.beforePhotos.length || 0;

    return (
      <View style={styles.imageViewerFooter}>
        <Text style={styles.imageCounter}>
          {currentIndex + 1} / {totalPhotos}
        </Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteBeforePhoto}
        >
          <Text style={styles.deleteButtonText}>Delete Photo</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderAfterImageViewerFooter = (currentIndex: number): JSX.Element => {
    const totalPhotos = job?.serviceRecord?.afterPhotos.length || 0;

    return (
      <View style={styles.imageViewerFooter}>
        <Text style={styles.imageCounter}>
          {currentIndex + 1} / {totalPhotos}
        </Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteAfterPhoto}
        >
          <Text style={styles.deleteButtonText}>Delete Photo</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderPhotoThumbnails = (photos: string[], onPress: (index: number) => void): JSX.Element => {
    if (photos.length === 0) {
      return <Text style={styles.value}>No photos</Text>;
    }

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.thumbnailScroll}
        contentContainerStyle={styles.thumbnailContainer}
      >
        {photos.map((photoUrl, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => onPress(index)}
            style={styles.thumbnailWrapper}
          >
            <Image
              source={{ uri: photoUrl }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const getStatusColor = (status: JobStatus): string => {
    return JOB_STATUS_COLORS[status] || '#6b7280';
  };

  const getStatusLabel = (status: JobStatus): string => {
    return JOB_STATUS[status] || status;
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading job details...</Text>
      </View>
    );
  }

  if (error || !job) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Error Loading Job</Text>
        <Text style={styles.errorText}>
          {error?.message || 'Job not found. Please try again.'}
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) }]}>
          <Text style={styles.statusText}>{getStatusLabel(job.status)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Equipment</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Make & Model:</Text>
            <Text style={styles.value}>
              {job.equipment.make} {job.equipment.model}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Serial Number:</Text>
            <Text style={styles.value}>{job.equipment.serialNumber}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Engine Hours:</Text>
            <Text style={styles.value}>{job.equipment.engineHours.toLocaleString()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Location:</Text>
            <Text style={styles.value}>{job.equipment.projectSite}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Customer:</Text>
            <Text style={styles.value}>{job.customerName}</Text>
          </View>
          <View style={styles.infoColumn}>
            <Text style={styles.label}>Site Address:</Text>
            <TouchableOpacity onPress={() => handleAddressPress(job.siteAddress)}>
              <Text style={[styles.value, styles.linkText]}>{job.siteAddress}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.navigateButton}
              onPress={() => handleNavigate(job.siteAddress)}
            >
              <View style={styles.navigateButtonContent}>
                <Ionicons name="navigate" size={16} color="#ffffff" />
                <Text style={styles.navigateButtonText}>Navigate</Text>
              </View>
            </TouchableOpacity>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Assigned:</Text>
            <Text style={styles.value}>{formatDate(job.assignedAt)}</Text>
          </View>
          <View style={styles.infoColumn}>
            <Text style={styles.label}>Issue Description:</Text>
            <Text style={styles.descriptionText}>{job.issueDescription}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.contactHeader}
            onPress={() => setContactInfoExpanded(!contactInfoExpanded)}
          >
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="call" size={18} color="#1f2937" />
              <Text style={styles.sectionTitle}>Contact Information</Text>
            </View>
            <Ionicons
              name={contactInfoExpanded ? "chevron-down" : "chevron-forward"}
              size={16}
              color="#6b7280"
            />
          </TouchableOpacity>
          {contactInfoExpanded && (
            <View style={styles.contactContent}>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Name:</Text>
                <Text style={styles.value}>{job.contactName}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Phone:</Text>
                <TouchableOpacity onPress={() => handlePhonePress(job.contactPhone)}>
                  <Text style={[styles.value, styles.linkText]}>{job.contactPhone}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Email:</Text>
                <TouchableOpacity onPress={() => handleEmailPress(job.contactEmail)}>
                  <Text style={[styles.value, styles.linkText, styles.emailText]}>{job.contactEmail}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {job.serviceRecord && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Check-In Details</Text>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Arrived At:</Text>
              <Text style={styles.value}>{formatDate(job.serviceRecord.arrivedAt)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Before Engine Hours:</Text>
              <Text style={styles.value}>
                {job.serviceRecord.beforeEngineHours.toLocaleString()}
              </Text>
            </View>
            {job.serviceRecord.beforeNotes && (
              <View style={styles.infoColumn}>
                <Text style={styles.label}>Initial Notes:</Text>
                <Text style={styles.descriptionText}>{job.serviceRecord.beforeNotes}</Text>
              </View>
            )}
            <View style={styles.infoColumn}>
              <Text style={styles.label}>Before Photos ({job.serviceRecord.beforePhotos.length}):</Text>
              {renderPhotoThumbnails(job.serviceRecord.beforePhotos, handleBeforeThumbnailPress)}
            </View>
            {job.status === 'IN_PROGRESS' && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={handleEditCheckIn}
              >
                <Text style={styles.editButtonText}>Edit Check-In</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {job.serviceRecord?.isJobComplete && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Completion Details</Text>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Completed At:</Text>
              <Text style={styles.value}>{formatDate(job.serviceRecord.completedAt)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>After Engine Hours:</Text>
              <Text style={styles.value}>
                {job.serviceRecord.afterEngineHours.toLocaleString()}
              </Text>
            </View>
            <View style={styles.infoColumn}>
              <Text style={styles.label}>Diagnosis:</Text>
              <Text style={styles.descriptionText}>{job.serviceRecord.diagnosis}</Text>
            </View>
            <View style={styles.infoColumn}>
              <Text style={styles.label}>Work Performed:</Text>
              <Text style={styles.descriptionText}>{job.serviceRecord.workPerformed}</Text>
            </View>
            {job.serviceRecord.partsUsed && (
              <View style={styles.infoColumn}>
                <Text style={styles.label}>Parts Used:</Text>
                <Text style={styles.descriptionText}>{job.serviceRecord.partsUsed}</Text>
              </View>
            )}
            <View style={styles.infoColumn}>
              <Text style={styles.label}>After Photos ({job.serviceRecord.afterPhotos.length}):</Text>
              {renderPhotoThumbnails(job.serviceRecord.afterPhotos, handleAfterThumbnailPress)}
            </View>
            {job.status === 'IN_PROGRESS' && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={handleEditCompletion}
              >
                <Text style={styles.editButtonText}>Edit Completion</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      <View style={styles.actionContainer}>
        {job.status === 'ASSIGNED' && (
          <TouchableOpacity style={styles.primaryButton} onPress={handleStartCheckIn}>
            <Text style={styles.primaryButtonText}>Start Check-In</Text>
          </TouchableOpacity>
        )}
        {job.status === 'IN_PROGRESS' && (
          <TouchableOpacity style={styles.primaryButton} onPress={handleCompleteJob}>
            <Text style={styles.primaryButtonText}>Complete Job</Text>
          </TouchableOpacity>
        )}
        {job.status === 'COMPLETED' && job.serviceRecord && (
          <View style={styles.editButtonsContainer}>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleEditCheckIn}>
              <Ionicons name="create-outline" size={20} color={COLORS.TEXT_PRIMARY} />
              <Text style={styles.secondaryButtonText}>Edit Check-In</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleEditCompletion}>
              <Ionicons name="create-outline" size={20} color={COLORS.TEXT_PRIMARY} />
              <Text style={styles.secondaryButtonText}>Edit Completion</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {job?.serviceRecord && (
        <>
          <ImageView
            images={job.serviceRecord.beforePhotos.map((uri) => ({ uri }))}
            imageIndex={beforeImageViewerIndex}
            visible={beforeImageViewerVisible}
            onRequestClose={() => setBeforeImageViewerVisible(false)}
            FooterComponent={(props) => renderBeforeImageViewerFooter(props.imageIndex)}
          />
          {job.serviceRecord.isJobComplete && (
            <ImageView
              images={job.serviceRecord.afterPhotos.map((uri) => ({ uri }))}
              imageIndex={afterImageViewerIndex}
              visible={afterImageViewerVisible}
              onRequestClose={() => setAfterImageViewerVisible(false)}
              FooterComponent={(props) => renderAfterImageViewerFooter(props.imageIndex)}
            />
          )}
        </>
      )}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND_LIGHT,
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.BACKGROUND_DARK,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_ON_DARK,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.BACKGROUND_LIGHT,
  },
  section: {
    backgroundColor: COLORS.BACKGROUND_LIGHT,
    borderRadius: 0,
    padding: 16,
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoColumn: {
    paddingVertical: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.TEXT_PRIMARY,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 20,
    marginTop: 4,
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactContent: {
    marginTop: 12,
  },
  linkText: {
    color: COLORS.PRIMARY_YELLOW,
    textDecorationLine: 'underline',
  },
  emailText: {
    fontSize: 13,
  },
  navigateButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.PRIMARY_YELLOW,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  navigateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navigateButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.TEXT_ON_YELLOW,
  },
  actionContainer: {
    padding: 16,
    backgroundColor: COLORS.BACKGROUND_LIGHT,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER_LIGHT,
  },
  primaryButton: {
    backgroundColor: COLORS.BACKGROUND_DARK,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_ON_DARK,
  },
  editButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.BACKGROUND_LIGHT,
    borderWidth: 1,
    borderColor: COLORS.BORDER_LIGHT,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  thumbnailScroll: {
    marginTop: 8,
  },
  thumbnailContainer: {
    gap: 8,
  },
  thumbnailWrapper: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.BORDER_LIGHT,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    backgroundColor: '#F3F4F6',
  },
  imageViewerFooter: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 12,
  },
  imageCounter: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: COLORS.PRIMARY_YELLOW,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.TEXT_ON_YELLOW,
    textAlign: 'center',
  },
});
