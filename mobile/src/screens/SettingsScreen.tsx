import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { BaseScreenProps } from '../types';
import { CONFIG } from '../constants/config';
import { useAuth } from '../contexts/AuthContext';

interface SettingsScreenProps extends BaseScreenProps {}

interface AppSettings {
  notifications: boolean;
  soundEffects: boolean;
  hapticFeedback: boolean;
  autoSync: boolean;
  darkMode: boolean;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings>({
    notifications: true,
    soundEffects: true,
    hapticFeedback: true,
    autoSync: true,
    darkMode: false,
  });

  const toggleSetting = (key: keyof AppSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handlePrivacyPolicy = () => {
    Alert.alert(
      'Privacy Policy',
      'Privacy policy functionality will be implemented in a future update.',
      [{ text: 'OK' }]
    );
  };

  const handleTermsOfService = () => {
    Alert.alert(
      'Terms of Service',
      'Terms of service functionality will be implemented in a future update.',
      [{ text: 'OK' }]
    );
  };

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'Support contact functionality will be implemented in a future update.',
      [{ text: 'OK' }]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Account Deletion',
              'Account deletion functionality will be implemented in a future update.',
              [{ text: 'OK' }]
            );
          },
        },
      ]
    );
  };

  const SettingRow: React.FC<{
    title: string;
    value: boolean;
    onToggle: () => void;
    description?: string;
  }> = ({ title, value, onToggle, description }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingTitle}>{title}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{
          false: CONFIG.COLORS.BORDER,
          true: CONFIG.COLORS.PRIMARY + '50',
        }}
        thumbColor={value ? CONFIG.COLORS.PRIMARY : CONFIG.COLORS.WHITE}
      />
    </View>
  );

  const ActionRow: React.FC<{
    title: string;
    onPress: () => void;
    destructive?: boolean;
  }> = ({ title, onPress, destructive = false }) => (
    <TouchableOpacity style={styles.actionRow} onPress={onPress}>
      <Text style={[
        styles.actionTitle,
        destructive && styles.destructiveText
      ]}>
        {title}
      </Text>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>

      {/* App Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Preferences</Text>
        <View style={styles.sectionContent}>
          <SettingRow
            title="Push Notifications"
            value={settings.notifications}
            onToggle={() => toggleSetting('notifications')}
            description="Get notified about workout reminders and achievements"
          />
          <SettingRow
            title="Sound Effects"
            value={settings.soundEffects}
            onToggle={() => toggleSetting('soundEffects')}
            description="Play sounds during workouts"
          />
          <SettingRow
            title="Haptic Feedback"
            value={settings.hapticFeedback}
            onToggle={() => toggleSetting('hapticFeedback')}
            description="Feel vibrations for rep counting"
          />
          <SettingRow
            title="Auto Sync"
            value={settings.autoSync}
            onToggle={() => toggleSetting('autoSync')}
            description="Automatically sync data when connected"
          />
          <SettingRow
            title="Dark Mode"
            value={settings.darkMode}
            onToggle={() => toggleSetting('darkMode')}
            description="Coming soon"
          />
        </View>
      </View>

      {/* Account */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.sectionContent}>
          <View style={styles.accountInfo}>
            <Text style={styles.accountLabel}>Email</Text>
            <Text style={styles.accountValue}>{user?.email}</Text>
          </View>
          <View style={styles.accountInfo}>
            <Text style={styles.accountLabel}>Member Since</Text>
            <Text style={styles.accountValue}>
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
        </View>
      </View>

      {/* Support & Legal */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support & Legal</Text>
        <View style={styles.sectionContent}>
          <ActionRow
            title="Privacy Policy"
            onPress={handlePrivacyPolicy}
          />
          <ActionRow
            title="Terms of Service"
            onPress={handleTermsOfService}
          />
          <ActionRow
            title="Contact Support"
            onPress={handleContactSupport}
          />
        </View>
      </View>

      {/* Danger Zone */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, styles.dangerTitle]}>Danger Zone</Text>
        <View style={styles.sectionContent}>
          <ActionRow
            title="Delete Account"
            onPress={handleDeleteAccount}
            destructive={true}
          />
        </View>
      </View>

      {/* App Version */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>FitProof v1.0.0</Text>
      </View>
    </ScrollView>
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
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: CONFIG.COLORS.TEXT_PRIMARY,
    marginBottom: 12,
  },
  dangerTitle: {
    color: CONFIG.COLORS.ERROR,
  },
  sectionContent: {
    backgroundColor: CONFIG.COLORS.WHITE,
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: CONFIG.COLORS.BORDER,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: CONFIG.COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: CONFIG.COLORS.TEXT_SECONDARY,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: CONFIG.COLORS.BORDER,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: CONFIG.COLORS.TEXT_PRIMARY,
  },
  destructiveText: {
    color: CONFIG.COLORS.ERROR,
  },
  chevron: {
    fontSize: 20,
    color: CONFIG.COLORS.TEXT_SECONDARY,
  },
  accountInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: CONFIG.COLORS.BORDER,
  },
  accountLabel: {
    fontSize: 16,
    color: CONFIG.COLORS.TEXT_SECONDARY,
  },
  accountValue: {
    fontSize: 16,
    fontWeight: '500',
    color: CONFIG.COLORS.TEXT_PRIMARY,
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  versionText: {
    fontSize: 14,
    color: CONFIG.COLORS.TEXT_SECONDARY,
  },
});