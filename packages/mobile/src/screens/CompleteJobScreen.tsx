import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ImageView from 'react-native-image-viewing';
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';
import type { CompleteJobScreenProps } from '../types/navigation';
import { trpc } from '../utils/trpc';
import { API_URL, COLORS } from '../config/constants';

const SCREEN_WIDTH = Dimensions.get('window').width;
const THUMBNAIL_SIZE = (SCREEN_WIDTH - 64) / 4;

interface PhotoAsset {
  uri: string;
  base64?: string;
}

interface CompleteJobDraft {
  diagnosis: string;
  workPerformed: string;
  partsUsed: string;
  afterEngineHours: string;
  photos: PhotoAsset[];
}

export function CompleteJobScreen({ route, navigation }: CompleteJobScreenProps): JSX.Element {
  const { jobId, serviceRecordId, isEditMode } = route.params;

  const [diagnosis, setDiagnosis] = useState('');
  const [workPerformed, setWorkPerformed] = useState('');
  const [partsUsed, setPartsUsed] = useState('');
  const [afterEngineHours, setAfterEngineHours] = useState('');
  const [photos, setPhotos] = useState<PhotoAsset[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(!!isEditMode);
  const [beforeImageViewerVisible, setBeforeImageViewerVisible] = useState(false);
  const [beforeImageViewerIndex, setBeforeImageViewerIndex] = useState(0);

  const utils = trpc.useUtils();
  const completeMutation = trpc.serviceRecord.complete.useMutation();
  const updateCompletionMutation = trpc.serviceRecord.updateCompletion.useMutation();
  const { data: job } = trpc.job.byId.useQuery({ jobId });

  const draftKey = `draft_complete_${serviceRecordId}`;

  useEffect(() => {
    if (isEditMode && job?.serviceRecord?.isJobComplete) {
      setDiagnosis(job.serviceRecord.diagnosis || '');
      setWorkPerformed(job.serviceRecord.workPerformed || '');
      setPartsUsed(job.serviceRecord.partsUsed || '');
      setAfterEngineHours(job.serviceRecord.afterEngineHours?.toString() || '');
      setPhotos(job.serviceRecord.afterPhotos.map(url => ({ uri: url })));
      setIsLoadingData(false);
    } else if (!isEditMode) {
      loadDraft();
      if (job?.serviceRecord?.beforeEngineHours) {
        setAfterEngineHours(job.serviceRecord.beforeEngineHours.toString());
      }
    }
  }, [job, isEditMode]);

  useEffect(() => {
    const saveDraftTimer = setTimeout(() => {
      saveDraft();
    }, 2000);

    return () => clearTimeout(saveDraftTimer);
  }, [diagnosis, workPerformed, partsUsed, afterEngineHours, photos]);

  const loadDraft = async (): Promise<void> => {
    try {
      const draftJson = await AsyncStorage.getItem(draftKey);
      if (draftJson) {
        const draft: CompleteJobDraft = JSON.parse(draftJson);
        Alert.alert(
          'Resume Draft?',
          'You have unsaved changes. Would you like to resume?',
          [
            {
              text: 'Discard',
              style: 'destructive',
              onPress: () => clearDraft(),
            },
            {
              text: 'Resume',
              onPress: () => {
                setDiagnosis(draft.diagnosis);
                setWorkPerformed(draft.workPerformed);
                setPartsUsed(draft.partsUsed);
                setAfterEngineHours(draft.afterEngineHours);
                setPhotos(draft.photos);
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };

  const saveDraft = async (): Promise<void> => {
    try {
      const draft: CompleteJobDraft = {
        diagnosis,
        workPerformed,
        partsUsed,
        afterEngineHours,
        photos,
      };
      await AsyncStorage.setItem(draftKey, JSON.stringify(draft));
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  const clearDraft = async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(draftKey);
    } catch (error) {
      console.error('Error clearing draft:', error);
    }
  };

  const takePhoto = async (): Promise<void> => {
    if (photos.length >= 4) {
      Alert.alert('Photo Limit', 'You can only attach up to 4 photos.');
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is required to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotos([...photos, { uri: result.assets[0].uri, base64: result.assets[0].base64 || undefined }]);
    }
  };

  const pickPhoto = async (): Promise<void> => {
    if (photos.length >= 4) {
      Alert.alert('Photo Limit', 'You can only attach up to 4 photos.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library permission is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotos([...photos, { uri: result.assets[0].uri, base64: result.assets[0].base64 || undefined }]);
    }
  };

  const removePhoto = (index: number): void => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const uploadPhoto = async (photo: PhotoAsset, index: number): Promise<string> => {
    if (!photo.uri.startsWith('http')) {
      if (!photo.base64) {
        throw new Error('Photo base64 data not available');
      }

      const filename = `complete_${jobId}_${Date.now()}_${index}.jpg`;
      const uploadUrl = API_URL.replace('/trpc', '/upload');

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename,
          base64: photo.base64,
          bucket: 'inspection-photos',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to upload photo');
      }

      const data = await response.json();
      return data.url;
    }
    return photo.uri;
  };

  const handleSubmit = async (): Promise<void> => {
    if (!diagnosis.trim()) {
      Alert.alert('Validation Error', 'Diagnosis is required.');
      return;
    }

    if (!workPerformed.trim()) {
      Alert.alert('Validation Error', 'Work performed is required.');
      return;
    }

    if (!afterEngineHours || isNaN(Number(afterEngineHours))) {
      Alert.alert('Validation Error', 'Please enter valid engine hours.');
      return;
    }

    const beforeHours = job?.serviceRecord?.beforeEngineHours || 0;
    if (Number(afterEngineHours) < beforeHours) {
      Alert.alert(
        'Validation Error',
        `After engine hours (${afterEngineHours}) cannot be less than before engine hours (${beforeHours}).`
      );
      return;
    }

    if (photos.length === 0) {
      Alert.alert(
        'No Photos',
        'It is recommended to attach at least one photo. Continue without photos?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => submitCompletion() },
        ]
      );
      return;
    }

    await submitCompletion();
  };

  const submitCompletion = async (): Promise<void> => {
    setIsSubmitting(true);

    try {
      const photoUrls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const url = await uploadPhoto(photos[i], i);
        photoUrls.push(url);
      }

      if (isEditMode) {
        await updateCompletionMutation.mutateAsync({
          serviceRecordId,
          afterPhotos: photoUrls,
          diagnosis: diagnosis.trim(),
          workPerformed: workPerformed.trim(),
          partsUsed: partsUsed.trim() || null,
          afterEngineHours: Number(afterEngineHours),
        });

        await utils.job.byId.invalidate({ jobId });
        await utils.job.listActive.invalidate();
        await utils.job.listCompleted.invalidate();

        Alert.alert('Success', 'Completion updated successfully!', [
          {
            text: 'OK',
            onPress: () => navigation.navigate('JobDetail', { jobId }),
          },
        ]);
      } else {
        await completeMutation.mutateAsync({
          serviceRecordId,
          afterPhotos: photoUrls,
          diagnosis: diagnosis.trim(),
          workPerformed: workPerformed.trim(),
          partsUsed: partsUsed.trim() || null,
          afterEngineHours: Number(afterEngineHours),
          completedAt: new Date(),
        });

        await clearDraft();
        await utils.job.listActive.invalidate();
        await utils.job.listCompleted.invalidate();
        await utils.job.byId.invalidate({ jobId });

        Alert.alert('Success', 'Job completed successfully!', [
          {
            text: 'OK',
            onPress: () => navigation.navigate('ActiveJobs'),
          },
        ]);
      }
    } catch (error: any) {
      console.error('Complete job error:', error);
      Alert.alert(
        isEditMode ? 'Update Failed' : 'Completion Failed',
        error?.message || `Failed to ${isEditMode ? 'update' : 'complete'} job. Please try again.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = (): void => {
    if (diagnosis || workPerformed || partsUsed || photos.length > 0) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleBeforeThumbnailPress = (index: number): void => {
    setBeforeImageViewerIndex(index);
    setBeforeImageViewerVisible(true);
  };

  const renderBeforePhotoThumbnails = (photos: string[]): JSX.Element => {
    if (photos.length === 0) {
      return <Text style={styles.beforeValue}>No photos</Text>;
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
            onPress={() => handleBeforeThumbnailPress(index)}
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

  if (isLoadingData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading completion data...</Text>
      </View>
    );
  }

  if (!job?.serviceRecord) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Service record not found. Please check in first.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{isEditMode ? 'Edit Completion' : 'Complete Job: After State'}</Text>
        <Text style={styles.subtitle}>
          {isEditMode
            ? 'Update the work performed and equipment condition documentation.'
            : 'Document the work performed and equipment condition after repair.'}
        </Text>

        <View style={styles.beforeSection}>
          <Text style={styles.beforeTitle}>Check-In Information</Text>
          <View style={styles.beforeRow}>
            <Text style={styles.beforeLabel}>Arrived:</Text>
            <Text style={styles.beforeValue}>{formatDate(job.serviceRecord.arrivedAt)}</Text>
          </View>
          <View style={styles.beforeRow}>
            <Text style={styles.beforeLabel}>Before Engine Hours:</Text>
            <Text style={styles.beforeValue}>
              {job.serviceRecord.beforeEngineHours.toLocaleString()}
            </Text>
          </View>
          {job.serviceRecord.beforeNotes && (
            <View style={styles.beforeColumn}>
              <Text style={styles.beforeLabel}>Initial Notes:</Text>
              <Text style={styles.beforeNotes}>{job.serviceRecord.beforeNotes}</Text>
            </View>
          )}
          <View style={styles.beforeColumn}>
            <Text style={styles.beforeLabel}>Before Photos ({job.serviceRecord.beforePhotos.length}):</Text>
            {renderBeforePhotoThumbnails(job.serviceRecord.beforePhotos)}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>
            Diagnosis <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={diagnosis}
            onChangeText={setDiagnosis}
            placeholder="What was the problem? What did you find?"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!isSubmitting}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>
            Work Performed <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={workPerformed}
            onChangeText={setWorkPerformed}
            placeholder="Describe the repairs, adjustments, or maintenance performed"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!isSubmitting}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Parts Used (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={partsUsed}
            onChangeText={setPartsUsed}
            placeholder="List parts replaced or used (include part numbers if available)"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            editable={!isSubmitting}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>
            After Engine Hours <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={afterEngineHours}
            onChangeText={setAfterEngineHours}
            placeholder="Enter engine hours after completion"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            editable={!isSubmitting}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>After Photos ({photos.length}/4)</Text>
          <View style={styles.photoGrid}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoContainer}>
                <Image source={{ uri: photo.uri }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removePhoto(index)}
                  disabled={isSubmitting}
                >
                  <FontAwesome6 name="trash" size={14} color="#6B7280" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
          {photos.length < 4 && (
            <View style={styles.photoActions}>
              <TouchableOpacity
                style={styles.photoButton}
                onPress={takePhoto}
                disabled={isSubmitting}
              >
                <View style={styles.photoButtonContent}>
                  <Ionicons name="camera" size={20} color="#374151" />
                  <Text style={styles.photoButtonText}>Take Photo</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.photoButton}
                onPress={pickPhoto}
                disabled={isSubmitting}
              >
                <View style={styles.photoButtonContent}>
                  <Ionicons name="images" size={20} color="#374151" />
                  <Text style={styles.photoButtonText}>Choose Photo</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
          disabled={isSubmitting}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>{isEditMode ? 'Update Completion' : 'Complete Job'}</Text>
          )}
        </TouchableOpacity>
      </View>

      {job?.serviceRecord && (
        <ImageView
          images={job.serviceRecord.beforePhotos.map((uri) => ({ uri }))}
          imageIndex={beforeImageViewerIndex}
          visible={beforeImageViewerVisible}
          onRequestClose={() => setBeforeImageViewerVisible(false)}
        />
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
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 20,
    lineHeight: 22,
  },
  beforeSection: {
    backgroundColor: COLORS.BACKGROUND_LIGHT,
    borderRadius: 0,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.INFO,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  beforeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 12,
  },
  beforeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  beforeColumn: {
    paddingVertical: 6,
  },
  beforeLabel: {
    fontSize: 14,
    color: '#1e40af',
    fontWeight: '500',
  },
  beforeValue: {
    fontSize: 14,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '700',
  },
  beforeNotes: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 4,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  required: {
    color: COLORS.ERROR,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: COLORS.BORDER_LIGHT,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.TEXT_PRIMARY,
  },
  textArea: {
    minHeight: 100,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  photoContainer: {
    width: '48%',
    aspectRatio: 1,
    marginRight: '4%',
    marginBottom: 12,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  photoButton: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_LIGHT,
    borderWidth: 1,
    borderColor: COLORS.BORDER_LIGHT,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  photoButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  actionContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.BACKGROUND_LIGHT,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER_LIGHT,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_LIGHT,
    borderWidth: 1,
    borderColor: COLORS.BORDER_LIGHT,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
    minHeight: 52,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
  },
  submitButton: {
    flex: 2,
    backgroundColor: COLORS.PRIMARY_YELLOW,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
    minHeight: 52,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.TEXT_TERTIARY,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_ON_YELLOW,
  },
  thumbnailScroll: {
    marginTop: 8,
  },
  thumbnailContainer: {
    paddingRight: 16,
  },
  thumbnailWrapper: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    marginRight: 8,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
});
