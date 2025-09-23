import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useMutation } from '@apollo/client/react';
import { BaseScreenProps } from '../types';
import { CONFIG } from '../constants/config';
import { useAuth } from '../contexts/AuthContext';
import { UPDATE_PROFILE_MUTATION } from '../graphql/profileMutations';

interface EditProfileScreenProps extends BaseScreenProps {}

interface ProfileForm {
  username: string;
  email: string;
}

export const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [form, setForm] = useState<ProfileForm>({
    username: '',
    email: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<ProfileForm>>({});

  const [updateProfileMutation] = useMutation(UPDATE_PROFILE_MUTATION);

  useEffect(() => {
    if (user) {
      setForm({
        username: user.username || '',
        email: user.email || '',
      });
    }
  }, [user]);

  const validateForm = (): boolean => {
    const newErrors: Partial<ProfileForm> = {};

    // Username validation
    if (!form.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (form.username.trim().length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(form.username.trim())) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    // Email validation
    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await updateProfileMutation({
        variables: {
          input: {
            email: form.email.trim(),
            username: form.username.trim(),
          },
        },
      });

      if (data?.updateProfile?.success) {
        Alert.alert(
          'Success',
          'Profile updated successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        // Handle validation errors from backend
        if (data?.updateProfile?.validationErrors?.length > 0) {
          const backendErrors: Partial<ProfileForm> = {};
          data.updateProfile.validationErrors.forEach((error: any) => {
            if (error.field === 'email' || error.field === 'username') {
              backendErrors[error.field] = error.message;
            }
          });
          setErrors(backendErrors);
        } else {
          Alert.alert(
            'Error',
            data?.updateProfile?.message || 'Failed to update profile. Please try again.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert(
        'Error',
        'Failed to update profile. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const updateForm = (field: keyof ProfileForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>User not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Edit Profile</Text>

        {/* Profile Picture Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {form.username ? form.username[0].toUpperCase() : form.email[0].toUpperCase()}
            </Text>
          </View>
          <TouchableOpacity style={styles.changePhotoButton}>
            <Text style={styles.changePhotoText}>Change Photo</Text>
          </TouchableOpacity>
          <Text style={styles.photoNote}>Profile picture functionality coming soon</Text>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={[
                styles.input,
                errors.username ? styles.inputError : null,
              ]}
              value={form.username}
              onChangeText={(value) => updateForm('username', value)}
              placeholder="Enter your username"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
            {errors.username && (
              <Text style={styles.errorText}>{errors.username}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[
                styles.input,
                errors.email ? styles.inputError : null,
              ]}
              value={form.email}
              onChangeText={(value) => updateForm('email', value)}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
            {errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={handleSave}
            disabled={isLoading}
          >
            <Text style={[styles.buttonText, styles.saveButtonText]}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleCancel}
            disabled={isLoading}
          >
            <Text style={[styles.buttonText, styles.cancelButtonText]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CONFIG.COLORS.BACKGROUND,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: CONFIG.COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: 30,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: CONFIG.COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: CONFIG.COLORS.WHITE,
  },
  changePhotoButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: CONFIG.COLORS.PRIMARY,
    borderRadius: 20,
    marginBottom: 8,
  },
  changePhotoText: {
    fontSize: 14,
    color: CONFIG.COLORS.WHITE,
    fontWeight: '600',
  },
  photoNote: {
    fontSize: 12,
    color: CONFIG.COLORS.TEXT_SECONDARY,
    fontStyle: 'italic',
  },
  formSection: {
    marginBottom: 40,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: CONFIG.COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: CONFIG.COLORS.BORDER,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: CONFIG.COLORS.WHITE,
    color: CONFIG.COLORS.TEXT_PRIMARY,
  },
  inputError: {
    borderColor: CONFIG.COLORS.ERROR,
  },
  buttonSection: {
    gap: 12,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: CONFIG.COLORS.PRIMARY,
  },
  saveButtonText: {
    color: CONFIG.COLORS.WHITE,
  },
  cancelButton: {
    backgroundColor: CONFIG.COLORS.WHITE,
    borderWidth: 1,
    borderColor: CONFIG.COLORS.BORDER,
  },
  cancelButtonText: {
    color: CONFIG.COLORS.TEXT_PRIMARY,
  },
  errorText: {
    fontSize: 14,
    color: CONFIG.COLORS.ERROR,
    marginTop: 4,
    textAlign: 'center',
  },
});