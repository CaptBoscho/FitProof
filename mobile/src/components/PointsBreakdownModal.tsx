import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { CONFIG } from '../constants/config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PointsBreakdown {
  basePoints: number;
  bonuses: {
    name: string;
    points: number;
    description: string;
  }[];
  multipliers: {
    name: string;
    multiplier: number;
    description: string;
  }[];
  totalPoints: number;
}

interface PointsBreakdownModalProps {
  visible: boolean;
  breakdown: PointsBreakdown;
  onClose: () => void;
}

/**
 * Modal that displays detailed points calculation breakdown
 */
export const PointsBreakdownModal: React.FC<PointsBreakdownModalProps> = ({
  visible,
  breakdown,
  onClose,
}) => {
  const hasMultipliers = breakdown.multipliers && breakdown.multipliers.length > 0;
  const hasBonuses = breakdown.bonuses && breakdown.bonuses.length > 0;
  const totalMultiplier = breakdown.multipliers.reduce((acc, m) => acc * m.multiplier, 1);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Points Breakdown</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Base Points */}
            <View style={styles.section}>
              <View style={styles.rowHeader}>
                <Text style={styles.sectionTitle}>Base Points</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.itemLabel}>Exercise Points</Text>
                <Text style={styles.itemValue}>{breakdown.basePoints}</Text>
              </View>
            </View>

            {/* Bonuses */}
            {hasBonuses && (
              <View style={styles.section}>
                <View style={styles.rowHeader}>
                  <Text style={styles.sectionTitle}>Bonuses</Text>
                </View>
                {breakdown.bonuses.map((bonus, index) => (
                  <View key={index} style={styles.row}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemLabel}>{bonus.name}</Text>
                      <Text style={styles.itemDescription}>{bonus.description}</Text>
                    </View>
                    <Text style={styles.itemValueBonus}>+{bonus.points}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Multipliers */}
            {hasMultipliers && (
              <View style={styles.section}>
                <View style={styles.rowHeader}>
                  <Text style={styles.sectionTitle}>Multipliers</Text>
                </View>
                {breakdown.multipliers.map((multiplier, index) => (
                  <View key={index} style={styles.row}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemLabel}>{multiplier.name}</Text>
                      <Text style={styles.itemDescription}>{multiplier.description}</Text>
                    </View>
                    <Text style={styles.itemValueMultiplier}>×{multiplier.multiplier}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Total */}
            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>Total Points Earned</Text>
              <Text style={styles.totalValue}>{breakdown.totalPoints}</Text>
            </View>

            {/* Calculation Summary */}
            <View style={styles.calculationSection}>
              <Text style={styles.calculationTitle}>Calculation:</Text>
              <Text style={styles.calculationText}>
                Base: {breakdown.basePoints}
              </Text>
              {hasBonuses && (
                <Text style={styles.calculationText}>
                  + Bonuses: {breakdown.bonuses.reduce((sum, b) => sum + b.points, 0)}
                </Text>
              )}
              {hasMultipliers && totalMultiplier !== 1 && (
                <Text style={styles.calculationText}>
                  × Multiplier: {totalMultiplier}
                </Text>
              )}
              <View style={styles.divider} />
              <Text style={styles.calculationText}>
                = {breakdown.totalPoints} points
              </Text>
            </View>
          </ScrollView>

          {/* Close Button */}
          <TouchableOpacity style={styles.closeFooterButton} onPress={onClose}>
            <Text style={styles.closeFooterButtonText}>Got it!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: CONFIG.COLORS.WHITE,
    borderRadius: 20,
    width: Math.min(SCREEN_WIDTH - 40, 400),
    maxHeight: '80%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: CONFIG.COLORS.TEXT_PRIMARY,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: CONFIG.COLORS.TEXT_SECONDARY,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  rowHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: CONFIG.COLORS.TEXT_PRIMARY,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: CONFIG.COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 12,
    color: CONFIG.COLORS.TEXT_SECONDARY,
  },
  itemValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: CONFIG.COLORS.PRIMARY,
  },
  itemValueBonus: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  itemValueMultiplier: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  totalSection: {
    backgroundColor: CONFIG.COLORS.PRIMARY,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },
  totalValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: CONFIG.COLORS.WHITE,
  },
  calculationSection: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  calculationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: CONFIG.COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  calculationText: {
    fontSize: 14,
    color: CONFIG.COLORS.TEXT_SECONDARY,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 8,
  },
  closeFooterButton: {
    backgroundColor: CONFIG.COLORS.PRIMARY,
    padding: 16,
    margin: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeFooterButtonText: {
    color: CONFIG.COLORS.WHITE,
    fontSize: 18,
    fontWeight: '600',
  },
});
