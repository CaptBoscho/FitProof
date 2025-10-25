import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { BaseScreenProps } from '../types';
import { CONFIG } from '../constants/config';

interface PointsHistoryItem {
  id: string;
  date: Date;
  points: number;
  action: string;
  exerciseType?: string;
  breakdown?: {
    basePoints: number;
    bonuses: { name: string; points: number }[];
    multipliers: { name: string; multiplier: number }[];
  };
}

interface PointsHistoryScreenProps extends BaseScreenProps {}

/**
 * Screen displaying user's points history with visualizations
 */
export const PointsHistoryScreen: React.FC<PointsHistoryScreenProps> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<PointsHistoryItem[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [filter, setFilter] = useState<'all' | 'week' | 'month'>('all');

  useEffect(() => {
    loadPointsHistory();
  }, [filter]);

  const loadPointsHistory = async () => {
    try {
      setLoading(true);

      // TODO: Replace with actual GraphQL query
      // For now, using mock data
      const mockHistory: PointsHistoryItem[] = [
        {
          id: '1',
          date: new Date(),
          points: 150,
          action: 'Completed Workout',
          exerciseType: 'Pushups',
          breakdown: {
            basePoints: 100,
            bonuses: [
              { name: 'Streak Bonus', points: 25 },
              { name: 'Perfect Form', points: 20 },
            ],
            multipliers: [
              { name: 'Weekend', multiplier: 1.5 },
            ],
          },
        },
        {
          id: '2',
          date: new Date(Date.now() - 86400000),
          points: 75,
          action: 'Completed Workout',
          exerciseType: 'Squats',
        },
        {
          id: '3',
          date: new Date(Date.now() - 172800000),
          points: 100,
          action: 'Milestone Bonus',
          exerciseType: 'Situps',
        },
      ];

      setHistory(mockHistory);
      setTotalPoints(mockHistory.reduce((sum, item) => sum + item.points, 0));
    } catch (error) {
      console.error('Failed to load points history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPointsHistory();
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderHistoryItem = (item: PointsHistoryItem) => (
    <View key={item.id} style={styles.historyItem}>
      <View style={styles.historyItemLeft}>
        <View style={[
          styles.pointsBadge,
          item.points > 100 ? styles.pointsBadgeHigh : styles.pointsBadgeNormal
        ]}>
          <Text style={styles.pointsBadgeText}>+{item.points}</Text>
        </View>
      </View>

      <View style={styles.historyItemMiddle}>
        <Text style={styles.historyItemAction}>{item.action}</Text>
        {item.exerciseType && (
          <Text style={styles.historyItemExercise}>{item.exerciseType}</Text>
        )}
        <Text style={styles.historyItemDate}>{formatDate(item.date)}</Text>
      </View>

      {item.breakdown && (
        <TouchableOpacity
          style={styles.detailsButton}
          onPress={() => {
            // TODO: Show breakdown modal
          }}
        >
          <Text style={styles.detailsButtonText}>Details</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={CONFIG.COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Loading points history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Stats */}
      <View style={styles.header}>
        <View style={styles.totalPointsCard}>
          <Text style={styles.totalPointsLabel}>Total Points Earned</Text>
          <Text style={styles.totalPointsValue}>{totalPoints.toLocaleString()}</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
            All Time
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'week' && styles.filterTabActive]}
          onPress={() => setFilter('week')}
        >
          <Text style={[styles.filterTabText, filter === 'week' && styles.filterTabTextActive]}>
            This Week
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'month' && styles.filterTabActive]}
          onPress={() => setFilter('month')}
        >
          <Text style={[styles.filterTabText, filter === 'month' && styles.filterTabTextActive]}>
            This Month
          </Text>
        </TouchableOpacity>
      </View>

      {/* History List */}
      <ScrollView
        style={styles.historyList}
        contentContainerStyle={styles.historyListContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {history.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No points history yet</Text>
            <Text style={styles.emptyStateSubtext}>Complete workouts to earn points!</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {history.map(renderHistoryItem)}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CONFIG.COLORS.BACKGROUND,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: CONFIG.COLORS.BACKGROUND,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: CONFIG.COLORS.TEXT_SECONDARY,
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  totalPointsCard: {
    backgroundColor: CONFIG.COLORS.PRIMARY,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  totalPointsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },
  totalPointsValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: CONFIG.COLORS.WHITE,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: CONFIG.COLORS.WHITE,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterTabActive: {
    backgroundColor: CONFIG.COLORS.PRIMARY,
    borderColor: CONFIG.COLORS.PRIMARY,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: CONFIG.COLORS.TEXT_SECONDARY,
  },
  filterTabTextActive: {
    color: CONFIG.COLORS.WHITE,
  },
  historyList: {
    flex: 1,
  },
  historyListContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: CONFIG.COLORS.TEXT_PRIMARY,
    marginBottom: 16,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CONFIG.COLORS.WHITE,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  historyItemLeft: {
    marginRight: 16,
  },
  pointsBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  pointsBadgeNormal: {
    backgroundColor: '#E8F5E9',
  },
  pointsBadgeHigh: {
    backgroundColor: '#FFF3E0',
  },
  pointsBadgeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  historyItemMiddle: {
    flex: 1,
  },
  historyItemAction: {
    fontSize: 16,
    fontWeight: '600',
    color: CONFIG.COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
  historyItemExercise: {
    fontSize: 14,
    color: CONFIG.COLORS.PRIMARY,
    marginBottom: 4,
  },
  historyItemDate: {
    fontSize: 12,
    color: CONFIG.COLORS.TEXT_SECONDARY,
  },
  detailsButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
  },
  detailsButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: CONFIG.COLORS.PRIMARY,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: CONFIG.COLORS.TEXT_SECONDARY,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: CONFIG.COLORS.TEXT_SECONDARY,
  },
});
