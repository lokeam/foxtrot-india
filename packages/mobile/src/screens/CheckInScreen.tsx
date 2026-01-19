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
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';
import type { CheckInScreenProps } from '../types/navigation';
import { trpc } from '../utils/trpc';
import { API_URL, COLORS } from '../config/constants';

interface PhotoAsset {
  uri: string;
  base64?: string;
}

interface CheckInDraft {
  beforeNotes: string;
  beforeEngineHours: string;
  photos: PhotoAsset[];
}

export function CheckInScreen({ route, navigation }: CheckInScreenProps): JSX.Element {
  const { jobId, equipmentId, serviceRecordId } = route.params;
  const isEditMode = !!serviceRecordId;

  const [beforeNotes, setBeforeNotes] = useState('');
  const [beforeEngineHours, setBeforeEngineHours] = useState('');
  const [photos, setPhotos] = useState<PhotoAsset[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(isEditMode);

  const utils = trpc.useUtils();
  const checkInMutation = trpc.serviceRecord.checkIn.useMutation();
  const updateCheckInMutation = trpc.serviceRecord.updateCheckIn.useMutation();
  const { data: job } = trpc.job.byId.useQuery({ jobId });

  const draftKey = `draft_checkin_${jobId}`;

  useEffect(() => {
    if (isEditMode && job?.serviceRecord) {
      setBeforeNotes(job.serviceRecord.beforeNotes || '');
      setBeforeEngineHours(job.serviceRecord.beforeEngineHours.toString());
      setPhotos(job.serviceRecord.beforePhotos.map(url => ({ uri: url })));
      setIsLoadingData(false);
    } else if (!isEditMode) {
      loadDraft();
      if (job?.equipment.engineHours) {
        setBeforeEngineHours(job.equipment.engineHours.toString());
      }
    }
  }, [job, isEditMode]);

  useEffect(() => {
    const saveDraftTimer = setTimeout(() => {
      saveDraft();
    }, 2000);

    return () => clearTimeout(saveDraftTimer);
  }, [beforeNotes, beforeEngineHours, photos]);

  const loadDraft = async (): Promise<void> => {
    try {
      const draftJson = await AsyncStorage.getItem(draftKey);
      if (draftJson) {
        const draft: CheckInDraft = JSON.parse(draftJson);
        setHasDraft(true);
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
                setBeforeNotes(draft.beforeNotes);
                setBeforeEngineHours(draft.beforeEngineHours);
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
      const draft: CheckInDraft = {
        beforeNotes,
        beforeEngineHours,
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
      setHasDraft(false);
    } catch (error) {
      console.error('Error clearing draft:', error);
    }
  };

  const takePhoto = async (): Promise<void> => {
    if (photos.length >= 4) {
      Alert.alert('Photo Limit', 'You can only attach up to 4 photos per check-in.');
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
      Alert.alert('Photo Limit', 'You can only attach up to 4 photos per check-in.');
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

      const filename = `checkin_${jobId}_${Date.now()}_${index}.jpg`;
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
    if (!beforeEngineHours || isNaN(Number(beforeEngineHours))) {
      Alert.alert('Validation Error', 'Please enter valid engine hours.');
      return;
    }

    if (photos.length === 0) {
      Alert.alert(
        'No Photos',
        'It is recommended to attach at least one photo. Continue without photos?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => submitCheckIn() },
        ]
      );
      return;
    }

    await submitCheckIn();
  };

  const submitCheckIn = async (): Promise<void> => {
    setIsSubmitting(true);

    try {
      const photoUrls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const url = await uploadPhoto(photos[i], i);
        photoUrls.push(url);
      }

      if (isEditMode && serviceRecordId) {
        await updateCheckInMutation.mutateAsync({
          serviceRecordId,
          beforePhotos: photoUrls,
          beforeNotes: beforeNotes || null,
          beforeEngineHours: Number(beforeEngineHours),
        });

        await utils.job.byId.invalidate({ jobId });
        await utils.job.listActive.invalidate();
        await utils.job.listCompleted.invalidate();

        Alert.alert('Success', 'Check-in updated successfully!', [
          {
            text: 'OK',
            onPress: () => navigation.navigate('JobDetail', { jobId }),
          },
        ]);
      } else {
        await checkInMutation.mutateAsync({
          jobId,
          beforePhotos: photoUrls,
          beforeNotes: beforeNotes || null,
          beforeEngineHours: Number(beforeEngineHours),
          arrivedAt: new Date(),
        });

        await clearDraft();
        await utils.job.listActive.invalidate();
        await utils.job.byId.invalidate({ jobId });

        Alert.alert('Success', 'Check-in completed successfully!', [
          {
            text: 'OK',
            onPress: () => navigation.navigate('ActiveJobs'),
          },
        ]);
      }
    } catch (error: any) {
      console.error('Check-in error:', error);
      Alert.alert(
        isEditMode ? 'Update Failed' : 'Check-In Failed',
        error?.message || `Failed to ${isEditMode ? 'update' : 'complete'} check-in. Please try again.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = (): void => {
    if (beforeNotes || photos.length > 0) {
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

  if (isLoadingData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading check-in data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{isEditMode ? 'Edit Check-In' : 'Check-In: Before State'}</Text>
        <Text style={styles.subtitle}>
          {isEditMode
            ? 'Update the equipment condition documentation.'
            : 'Document the equipment condition when you arrive at the job site.'}
        </Text>

        <View style={styles.section}>
          <Text style={styles.label}>
            Before Engine Hours <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={beforeEngineHours}
            onChangeText={setBeforeEngineHours}
            placeholder="Enter current engine hours"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            editable={!isSubmitting}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Before Notes</Text>
          <TextInput
            style={styles.textArea}
            value={beforeNotes}
            onChangeText={setBeforeNotes}
            placeholder="Add notes about the equipment condition..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!isSubmitting}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Before Photos ({photos.length}/4)</Text>
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
          <Text style={styles.submitButtonText}>{isEditMode ? 'Update Check-In' : 'Complete Check-In'}</Text>
        )}
      </TouchableOpacity>
    </View>
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
    marginBottom: 24,
    lineHeight: 22,
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
    borderWidth: 1,
    borderColor: COLORS.BORDER_LIGHT,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.TEXT_PRIMARY,
    backgroundColor: '#F3F4F6',
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
    backgroundColor: COLORS.BACKGROUND_DARK,
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
    color: COLORS.TEXT_ON_DARK,
  },
});
