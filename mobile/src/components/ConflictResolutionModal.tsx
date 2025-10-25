import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { CONFIG } from '../constants/config';
import { SyncConflict, ConflictResolutionService } from '../services/conflictResolution';

interface ConflictResolutionModalProps {
  visible: boolean;
  conflict: SyncConflict | null;
  onResolve: (action: 'accepted' | 'retry' | 'skip') => void;
  onClose: () => void;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  visible,
  conflict,
  onResolve,
  onClose,
}) => {
  if (!conflict) return null;

  const requiresManualResolution = ConflictResolutionService.requiresUserAttention(conflict);

  const handleAccept = () => {
    onResolve('accepted');
    onClose();
  };

  const handleRetry = () => {
    onResolve('retry');
    onClose();
  };

  const handleSkip = () => {
    onResolve('skip');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Sync Conflict</Text>
            <Text style={styles.subtitle}>
              {ConflictResolutionService.formatResolution(conflict.resolution)}
            </Text>
          </View>

          <ScrollView style={styles.content}>
            {conflict.message && (
              <View style={styles.messageContainer}>
                <Text style={styles.message}>{conflict.message}</Text>
              </View>
            )}

            {conflict.conflictFields.length > 0 && (
              <View style={styles.fieldsContainer}>
                <Text style={styles.fieldsTitle}>Affected Fields:</Text>
                {conflict.conflictFields.map((field, index) => (
                  <View key={index} style={styles.fieldItem}>
                    <Text style={styles.fieldBullet}>•</Text>
                    <Text style={styles.fieldName}>
                      {ConflictResolutionService.formatFieldName(field)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>
                {ConflictResolutionService.getRecommendedActionText(conflict)}
              </Text>
            </View>

            {conflict.serverUpdatedAt && conflict.clientUpdatedAt && (
              <View style={styles.timestampContainer}>
                <Text style={styles.timestampLabel}>Server updated:</Text>
                <Text style={styles.timestampValue}>
                  {new Date(conflict.serverUpdatedAt).toLocaleString()}
                </Text>
                <Text style={styles.timestampLabel}>Your version:</Text>
                <Text style={styles.timestampValue}>
                  {new Date(conflict.clientUpdatedAt).toLocaleString()}
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.actions}>
            {requiresManualResolution ? (
              <>
                <TouchableOpacity style={styles.buttonSecondary} onPress={handleSkip}>
                  <Text style={styles.buttonSecondaryText}>Skip</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.buttonPrimary} onPress={handleRetry}>
                  <Text style={styles.buttonPrimaryText}>Keep My Version</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.buttonSecondary} onPress={handleRetry}>
                  <Text style={styles.buttonSecondaryText}>Retry</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.buttonPrimary} onPress={handleAccept}>
                  <Text style={styles.buttonPrimaryText}>OK</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: CONFIG.COLORS.WHITE,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: CONFIG.COLORS.ERROR,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: CONFIG.COLORS.TEXT_SECONDARY,
  },
  content: {
    padding: 20,
  },
  messageContainer: {
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: CONFIG.COLORS.TEXT_PRIMARY,
    lineHeight: 22,
  },
  fieldsContainer: {
    marginBottom: 16,
  },
  fieldsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: CONFIG.COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  fieldItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  fieldBullet: {
    fontSize: 16,
    color: CONFIG.COLORS.TEXT_SECONDARY,
    marginRight: 8,
  },
  fieldName: {
    fontSize: 14,
    color: CONFIG.COLORS.TEXT_SECONDARY,
  },
  infoContainer: {
    backgroundColor: '#FFF9E6',
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  timestampContainer: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
  },
  timestampLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: CONFIG.COLORS.TEXT_SECONDARY,
    marginTop: 4,
  },
  timestampValue: {
    fontSize: 12,
    color: CONFIG.COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    gap: 12,
  },
  buttonPrimary: {
    flex: 1,
    backgroundColor: CONFIG.COLORS.PRIMARY,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPrimaryText: {
    color: CONFIG.COLORS.WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSecondary: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CONFIG.COLORS.PRIMARY,
  },
  buttonSecondaryText: {
    color: CONFIG.COLORS.PRIMARY,
    fontSize: 16,
    fontWeight: '600',
  },
});
