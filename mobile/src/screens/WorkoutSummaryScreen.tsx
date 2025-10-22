import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { BaseScreenProps } from '../types';
import { CONFIG } from '../constants/config';

interface WorkoutSummaryScreenProps extends BaseScreenProps {
  route: {
    params: {
      exerciseType: string;
      duration: number; // in seconds
      totalReps: number;
      validReps: number;
      invalidReps: number;
      formErrors: string[];
    };
  };
}

export const WorkoutSummaryScreen: React.FC<WorkoutSummaryScreenProps> = ({ navigation, route }) => {
  const { exerciseType, duration, totalReps, validReps, invalidReps, formErrors } = route.params;

  // Calculate statistics
  const validPercentage = totalReps > 0 ? ((validReps / totalReps) * 100).toFixed(1) : '0.0';
  const invalidPercentage = totalReps > 0 ? ((invalidReps / totalReps) * 100).toFixed(1) : '0.0';

  // Format duration
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  const durationText = `${minutes}m ${seconds}s`;

  // Count error frequency
  const errorCounts: { [key: string]: number } = {};
  formErrors.forEach(error => {
    errorCounts[error] = (errorCounts[error] || 0) + 1;
  });

  // Sort errors by frequency
  const sortedErrors = Object.entries(errorCounts).sort((a, b) => b[1] - a[1]);

  const handleDone = () => {
    // Navigate back to home or exercises screen
    navigation.navigate('Home');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Workout Complete!</Text>
          <Text style={styles.exerciseType}>{exerciseType.charAt(0).toUpperCase() + exerciseType.slice(1)}</Text>
        </View>

        {/* Duration Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Duration</Text>
          <Text style={styles.cardValue}>{durationText}</Text>
        </View>

        {/* Rep Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{totalReps}</Text>
            <Text style={styles.statLabel}>Total Reps</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, styles.validColor]}>{validReps}</Text>
            <Text style={styles.statLabel}>Valid Reps</Text>
            <Text style={styles.statPercentage}>{validPercentage}%</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, styles.invalidColor]}>{invalidReps}</Text>
            <Text style={styles.statLabel}>Invalid Reps</Text>
            <Text style={styles.statPercentage}>{invalidPercentage}%</Text>
          </View>
        </View>

        {/* Form Feedback Section */}
        {sortedErrors.length > 0 && (
          <View style={styles.feedbackSection}>
            <Text style={styles.sectionTitle}>Common Form Issues</Text>
            <View style={styles.errorList}>
              {sortedErrors.map(([error, count], index) => (
                <View key={index} style={styles.errorItem}>
                  <View style={styles.errorBullet} />
                  <Text style={styles.errorText}>{error}</Text>
                  <Text style={styles.errorCount}>×{count}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Success Message */}
        {validReps > 0 && (
          <View style={styles.successSection}>
            <Text style={styles.successText}>
              {validPercentage === '100.0'
                ? '🎉 Perfect form! All reps were valid!'
                : `Great job! ${validPercentage}% of your reps had good form.`}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Done Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CONFIG.COLORS.BACKGROUND,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Space for footer button
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: CONFIG.COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  exerciseType: {
    fontSize: 24,
    color: CONFIG.COLORS.PRIMARY,
    fontWeight: '600',
  },
  card: {
    backgroundColor: CONFIG.COLORS.WHITE,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardLabel: {
    fontSize: 16,
    color: CONFIG.COLORS.TEXT_SECONDARY,
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: CONFIG.COLORS.PRIMARY,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    backgroundColor: CONFIG.COLORS.WHITE,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: CONFIG.COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  validColor: {
    color: '#00CC00',
  },
  invalidColor: {
    color: '#FF3B30',
  },
  statLabel: {
    fontSize: 12,
    color: CONFIG.COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  statPercentage: {
    fontSize: 14,
    color: CONFIG.COLORS.TEXT_SECONDARY,
    marginTop: 4,
    fontWeight: '600',
  },
  feedbackSection: {
    backgroundColor: CONFIG.COLORS.WHITE,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: CONFIG.COLORS.TEXT_PRIMARY,
    marginBottom: 16,
  },
  errorList: {
    marginTop: 8,
  },
  errorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  errorBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: CONFIG.COLORS.ERROR,
    marginRight: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: CONFIG.COLORS.TEXT_PRIMARY,
  },
  errorCount: {
    fontSize: 14,
    fontWeight: '600',
    color: CONFIG.COLORS.TEXT_SECONDARY,
    marginLeft: 8,
  },
  successSection: {
    backgroundColor: '#E8F5E9',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  successText: {
    fontSize: 16,
    color: '#2E7D32',
    textAlign: 'center',
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: CONFIG.COLORS.WHITE,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  doneButton: {
    backgroundColor: CONFIG.COLORS.PRIMARY,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: CONFIG.COLORS.WHITE,
    fontSize: 18,
    fontWeight: '600',
  },
});
