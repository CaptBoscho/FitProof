import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { BaseScreenProps, Exercise } from '../types';
import { CONFIG } from '../constants/config';

interface ExercisesScreenProps extends BaseScreenProps {}

const MOCK_EXERCISES: Exercise[] = [
  {
    id: '1',
    name: 'Pushup',
    pointsPerRep: 2,
    description: 'Standard pushup exercise',
    validationRules: ['proper_form', 'full_range_of_motion'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Situp',
    pointsPerRep: 2,
    description: 'Standard situp exercise',
    validationRules: ['proper_form', 'full_range_of_motion'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Squat',
    pointsPerRep: 1,
    description: 'Bodyweight squat exercise',
    validationRules: ['proper_depth', 'knee_tracking'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const ExercisesScreen: React.FC<ExercisesScreenProps> = ({ navigation }) => {
  const handleExerciseSelect = (exercise: Exercise) => {
    // Navigate to workout screen with selected exercise
    navigation.navigate('Workout', { exerciseId: exercise.id });
  };

  const renderExerciseItem = ({ item }: { item: Exercise }) => {
    const exerciseConfig =
      CONFIG.EXERCISES[item.name.toUpperCase() as keyof typeof CONFIG.EXERCISES];

    return (
      <TouchableOpacity style={styles.exerciseCard} onPress={() => handleExerciseSelect(item)}>
        <View
          style={[
            styles.exerciseIcon,
            { backgroundColor: exerciseConfig?.color || CONFIG.COLORS.PRIMARY },
          ]}
        >
          <Text style={styles.exerciseIconText}>{item.name[0]}</Text>
        </View>

        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName}>{item.name}</Text>
          <Text style={styles.exerciseDescription}>{item.description}</Text>
          <Text style={styles.exercisePoints}>{item.pointsPerRep} points per rep</Text>
        </View>

        <View style={styles.exerciseAction}>
          <Text style={styles.startText}>START</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Exercise</Text>
        <Text style={styles.subtitle}>Choose your workout</Text>
      </View>

      <FlatList
        data={MOCK_EXERCISES}
        renderItem={renderExerciseItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.footerInfo}>
        <Text style={styles.footerText}>
          💡 Tip: Position your camera to capture your full body for best results
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CONFIG.COLORS.BACKGROUND,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: CONFIG.COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: CONFIG.COLORS.TEXT_SECONDARY,
  },
  listContainer: {
    padding: 20,
  },
  exerciseCard: {
    backgroundColor: CONFIG.COLORS.WHITE,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  exerciseIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  exerciseIconText: {
    color: CONFIG.COLORS.WHITE,
    fontSize: 24,
    fontWeight: 'bold',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 20,
    fontWeight: '600',
    color: CONFIG.COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  exerciseDescription: {
    fontSize: 14,
    color: CONFIG.COLORS.TEXT_SECONDARY,
    marginBottom: 4,
  },
  exercisePoints: {
    fontSize: 14,
    color: CONFIG.COLORS.PRIMARY,
    fontWeight: '500',
  },
  exerciseAction: {
    paddingLeft: 16,
  },
  startText: {
    color: CONFIG.COLORS.PRIMARY,
    fontSize: 16,
    fontWeight: '600',
  },
  footerInfo: {
    padding: 20,
    backgroundColor: CONFIG.COLORS.WHITE,
    borderTopWidth: 1,
    borderTopColor: CONFIG.COLORS.BORDER,
  },
  footerText: {
    fontSize: 14,
    color: CONFIG.COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
});
