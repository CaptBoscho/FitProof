import { WorkoutSession } from '../entities/WorkoutSession';
import { SyncWorkoutSessionInput } from '../types/SyncTypes';

/**
 * Conflict resolution strategies
 */
export enum ConflictResolutionStrategy {
  SERVER_WINS = 'server_wins',
  CLIENT_WINS = 'client_wins',
  MERGE = 'merge',
  MANUAL = 'manual',
}

/**
 * Conflict details
 */
export interface ConflictInfo {
  hasConflict: boolean;
  conflictFields: string[];
  strategy: ConflictResolutionStrategy;
  serverData: any;
  clientData: any;
  serverUpdatedAt: Date;
  clientUpdatedAt: Date;
  message: string;
  deviceId?: string; // Device that made the conflicting change
  deviceName?: string; // Human-readable device name
}

/**
 * Merged data result
 */
export interface MergedData {
  totalReps: number;
  validReps: number;
  invalidReps?: number;
  totalPoints: number;
  durationSeconds: number;
  isCompleted: boolean;
  completedAt?: Date;
}

/**
 * Conflict Resolution Service
 * Handles detection and resolution of sync conflicts
 */
export class ConflictResolutionService {
  /**
   * Detect if there's a conflict between client and server data
   */
  static detectConflict(
    clientData: SyncWorkoutSessionInput,
    serverData: WorkoutSession,
    deviceId?: string,
    deviceName?: string
  ): ConflictInfo {
    const clientUpdatedAt = new Date(clientData.updatedAt);
    const serverUpdatedAt = new Date(serverData.updatedAt);
    const conflictFields: string[] = [];

    // Compare timestamps
    const timeDiff = serverUpdatedAt.getTime() - clientUpdatedAt.getTime();

    // If server is significantly newer (> 5 seconds), potential conflict
    if (timeDiff > 5000) {
      // Check which fields differ
      if (serverData.totalReps !== clientData.totalReps) {
        conflictFields.push('totalReps');
      }
      if (serverData.validReps !== clientData.validReps) {
        conflictFields.push('validReps');
      }
      if (serverData.totalPoints !== clientData.points) {
        conflictFields.push('totalPoints');
      }
      if (serverData.durationSeconds !== clientData.duration) {
        conflictFields.push('durationSeconds');
      }
      if (serverData.isCompleted !== clientData.isCompleted) {
        conflictFields.push('isCompleted');
      }

      if (conflictFields.length > 0) {
        // Determine strategy based on conflict type
        const strategy = this.determineStrategy(conflictFields, clientData, serverData);

        const deviceInfo = deviceName ? ` (from ${deviceName})` : '';

        return {
          hasConflict: true,
          conflictFields,
          strategy,
          serverData: {
            totalReps: serverData.totalReps,
            validReps: serverData.validReps,
            totalPoints: serverData.totalPoints,
            durationSeconds: serverData.durationSeconds,
            isCompleted: serverData.isCompleted,
            updatedAt: serverData.updatedAt,
          },
          clientData: {
            totalReps: clientData.totalReps,
            validReps: clientData.validReps,
            totalPoints: clientData.points,
            durationSeconds: clientData.duration,
            isCompleted: clientData.isCompleted,
            updatedAt: clientData.updatedAt,
          },
          serverUpdatedAt,
          clientUpdatedAt,
          deviceId,
          deviceName,
          message: `Server data is newer by ${(timeDiff / 1000).toFixed(1)}s${deviceInfo}. Conflicting fields: ${conflictFields.join(', ')}`,
        };
      }
    }

    // No conflict
    return {
      hasConflict: false,
      conflictFields: [],
      strategy: ConflictResolutionStrategy.CLIENT_WINS,
      serverData: null,
      clientData: null,
      serverUpdatedAt,
      clientUpdatedAt,
      message: 'No conflict detected',
    };
  }

  /**
   * Determine the best resolution strategy
   */
  private static determineStrategy(
    conflictFields: string[],
    clientData: SyncWorkoutSessionInput,
    serverData: WorkoutSession
  ): ConflictResolutionStrategy {
    // If completion status differs, prefer completed version
    if (conflictFields.includes('isCompleted')) {
      if (serverData.isCompleted && !clientData.isCompleted) {
        return ConflictResolutionStrategy.SERVER_WINS;
      }
      if (clientData.isCompleted && !serverData.isCompleted) {
        return ConflictResolutionStrategy.CLIENT_WINS;
      }
    }

    // If only metrics differ (reps, points, duration), use merge strategy
    const metricsOnly = conflictFields.every(field =>
      ['totalReps', 'validReps', 'totalPoints', 'durationSeconds'].includes(field)
    );

    if (metricsOnly) {
      return ConflictResolutionStrategy.MERGE;
    }

    // Default: server wins (conservative approach)
    return ConflictResolutionStrategy.SERVER_WINS;
  }

  /**
   * Resolve conflict using the specified strategy
   */
  static resolveConflict(
    clientData: SyncWorkoutSessionInput,
    serverData: WorkoutSession,
    strategy: ConflictResolutionStrategy
  ): MergedData {
    switch (strategy) {
      case ConflictResolutionStrategy.SERVER_WINS:
        return {
          totalReps: serverData.totalReps,
          validReps: serverData.validReps,
          invalidReps: serverData.totalReps - serverData.validReps,
          totalPoints: serverData.totalPoints,
          durationSeconds: serverData.durationSeconds,
          isCompleted: serverData.isCompleted,
          completedAt: serverData.completedAt || undefined,
        };

      case ConflictResolutionStrategy.CLIENT_WINS:
        return {
          totalReps: clientData.totalReps,
          validReps: clientData.validReps,
          invalidReps: clientData.invalidReps,
          totalPoints: clientData.points,
          durationSeconds: clientData.duration,
          isCompleted: clientData.isCompleted,
          completedAt: clientData.isCompleted ? new Date(clientData.updatedAt) : undefined,
        };

      case ConflictResolutionStrategy.MERGE:
        // Intelligent merge: use maximum values for metrics
        return {
          totalReps: Math.max(serverData.totalReps, clientData.totalReps),
          validReps: Math.max(serverData.validReps, clientData.validReps),
          invalidReps: Math.max(
            serverData.totalReps - serverData.validReps,
            clientData.invalidReps
          ),
          totalPoints: Math.max(serverData.totalPoints, clientData.points),
          durationSeconds: Math.max(serverData.durationSeconds, clientData.duration),
          isCompleted: serverData.isCompleted || clientData.isCompleted,
          completedAt: serverData.completedAt || (clientData.isCompleted ? new Date(clientData.updatedAt) : undefined),
        };

      case ConflictResolutionStrategy.MANUAL:
      default:
        // Manual resolution required - return server data as default
        return {
          totalReps: serverData.totalReps,
          validReps: serverData.validReps,
          invalidReps: serverData.totalReps - serverData.validReps,
          totalPoints: serverData.totalPoints,
          durationSeconds: serverData.durationSeconds,
          isCompleted: serverData.isCompleted,
          completedAt: serverData.completedAt || undefined,
        };
    }
  }

  /**
   * Generate a human-readable conflict report
   */
  static generateConflictReport(conflict: ConflictInfo): string {
    if (!conflict.hasConflict) {
      return 'No conflicts detected';
    }

    const lines: string[] = [
      '⚠️  Conflict Detected',
      `Strategy: ${conflict.strategy}`,
      `Time Difference: ${((conflict.serverUpdatedAt.getTime() - conflict.clientUpdatedAt.getTime()) / 1000).toFixed(1)}s`,
      '',
      'Conflicting Fields:',
    ];

    conflict.conflictFields.forEach(field => {
      const serverValue = conflict.serverData[field];
      const clientValue = conflict.clientData[field];
      lines.push(`  - ${field}: Server=${serverValue}, Client=${clientValue}`);
    });

    lines.push('');
    lines.push(conflict.message);

    return lines.join('\n');
  }

  /**
   * Check if conflict requires manual intervention
   */
  static requiresManualResolution(conflict: ConflictInfo): boolean {
    return conflict.strategy === ConflictResolutionStrategy.MANUAL;
  }

  /**
   * Get recommended action for user
   */
  static getRecommendedAction(conflict: ConflictInfo): string {
    if (!conflict.hasConflict) {
      return 'Proceed with sync';
    }

    switch (conflict.strategy) {
      case ConflictResolutionStrategy.SERVER_WINS:
        return 'Server data will be kept. Your local changes will be discarded.';

      case ConflictResolutionStrategy.CLIENT_WINS:
        return 'Your local data will be uploaded. Server data will be overwritten.';

      case ConflictResolutionStrategy.MERGE:
        return 'Data will be merged automatically using maximum values.';

      case ConflictResolutionStrategy.MANUAL:
        return 'Manual resolution required. Please review and choose which version to keep.';

      default:
        return 'Unknown strategy';
    }
  }
}
