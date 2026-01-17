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
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';
import type { InspectionFormScreenProps } from '../types/navigation';
import { trpc } from '../utils/trpc';
import { INSPECTOR_NAME, COLORS } from '../config/constants';

type EquipmentStatus = 'OPERATIONAL' | 'NEEDS_MAINTENANCE' | 'OUT_OF_SERVICE';

interface PhotoAsset {
  uri: string;
  base64?: string;
}

export function InspectionFormScreen({ route, navigation }: InspectionFormScreenProps) {
  const { equipmentId } = route.params;

  const [status, setStatus] = useState<EquipmentStatus>('OPERATIONAL');
  const [engineHours, setEngineHours] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<PhotoAsset[]>([]);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createInspectionMutation = trpc.inspection.create.useMutation();

  useEffect(() => {
    requestPermissions();
    getCurrentLocation();
  }, []);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();

    if (cameraStatus !== 'granted' || mediaStatus !== 'granted' || locationStatus !== 'granted') {
      Alert.alert('Permissions Required', 'Camera, media library, and location permissions are required for inspections.');
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const takePhoto = async () => {
    if (photos.length >= 4) {
      Alert.alert('Photo Limit', 'You can only attach up to 4 photos per inspection.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotos([...photos, { uri: result.assets[0].uri, base64: result.assets[0].base64 }]);
    }
  };

  const pickPhoto = async () => {
    if (photos.length >= 4) {
      Alert.alert('Photo Limit', 'You can only attach up to 4 photos per inspection.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotos([...photos, { uri: result.assets[0].uri, base64: result.assets[0].base64 }]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const uploadPhotoToSupabase = async (photo: PhotoAsset, inspectionId: string, index: number): Promise<string> => {
    try {
      const filename = `${inspectionId}_${index}_${Date.now()}.jpg`;
      const base64Data = photo.base64 || '';

      const apiBaseUrl = Platform.OS === 'android' ? 'http://10.0.2.2:3002' : 'http://localhost:3002';

      const response = await fetch(`${apiBaseUrl}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename,
          base64: base64Data,
          bucket: 'inspections',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to upload photo');
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Error uploading photo:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!engineHours || isNaN(Number(engineHours))) {
      Alert.alert('Validation Error', 'Please enter valid engine hours.');
      return;
    }

    if (photos.length === 0) {
      Alert.alert('Photos Required', 'Please add at least one photo for the inspection.');
      return;
    }

    setIsSubmitting(true);

    try {
      const tempInspectionId = `temp_${Date.now()}`;
      const photoUrls: string[] = [];

      for (let i = 0; i < photos.length; i++) {
        const url = await uploadPhotoToSupabase(photos[i], tempInspectionId, i);
        photoUrls.push(url);
      }

      await createInspectionMutation.mutateAsync({
        equipmentId,
        inspectorName: INSPECTOR_NAME,
        status,
        engineHours: Number(engineHours),
        notes: notes || undefined,
        photos: photoUrls,
        latitude: location?.latitude,
        longitude: location?.longitude,
      });

      Alert.alert('Success', 'Inspection submitted successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('Error submitting inspection:', error);
      Alert.alert('Error', 'Failed to submit inspection. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.section}>
        <Text style={styles.label}>Equipment Status *</Text>
        <View style={styles.statusButtons}>
          {(['OPERATIONAL', 'NEEDS_MAINTENANCE', 'OUT_OF_SERVICE'] as EquipmentStatus[]).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.statusButton, status === s && styles.statusButtonActive]}
              onPress={() => setStatus(s)}
            >
              <Text style={[styles.statusButtonText, status === s && styles.statusButtonTextActive]}>
                {s.replace(/_/g, ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Engine Hours *</Text>
        <TextInput
          style={styles.input}
          value={engineHours}
          onChangeText={setEngineHours}
          placeholder="Enter engine hours"
          placeholderTextColor="#9CA3AF"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Add inspection notes (optional)"
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Photos * ({photos.length}/4)</Text>
        <View style={styles.photoButtons}>
          <TouchableOpacity style={styles.photoButton} onPress={takePhoto} disabled={photos.length >= 4}>
            <View style={styles.photoButtonContent}>
              <Ionicons name="camera" size={18} color="#ffffff" />
              <Text style={styles.photoButtonText}>Take Photo</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.photoButton} onPress={pickPhoto} disabled={photos.length >= 4}>
            <View style={styles.photoButtonContent}>
              <Ionicons name="images" size={18} color="#ffffff" />
              <Text style={styles.photoButtonText}>Choose Photo</Text>
            </View>
          </TouchableOpacity>
        </View>

        {photos.length > 0 && (
          <View style={styles.photoGrid}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoContainer}>
                <Image source={{ uri: photo.uri }} style={styles.photo} />
                <TouchableOpacity style={styles.removeButton} onPress={() => removePhoto(index)}>
                  <FontAwesome6 name="trash" size={14} color="#6B7280" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {location && (
        <View style={styles.section}>
          <Text style={styles.locationText}>
            📍 Location: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Submit Inspection</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND_LIGHT,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  statusButtons: {
    gap: 8,
  },
  statusButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  statusButtonActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  statusButtonTextActive: {
    color: '#3b82f6',
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    minHeight: 100,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  photoButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: COLORS.BACKGROUND_DARK,
    alignItems: 'center',
  },
  photoButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  photoButtonText: {
    color: COLORS.TEXT_ON_YELLOW,
    fontSize: 14,
    fontWeight: '700',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoContainer: {
    width: '48%',
    aspectRatio: 1,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationText: {
    fontSize: 14,
    color: '#6b7280',
  },
  submitButton: {
    backgroundColor: COLORS.PRIMARY_YELLOW,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    margin: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: COLORS.TEXT_ON_YELLOW,
    fontSize: 18,
    fontWeight: '700',
  },
});
