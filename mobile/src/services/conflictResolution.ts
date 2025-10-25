/**
 * Conflict Resolution Service for Mobile
 * Handles sync conflicts reported by backend
 */

export interface SyncConflict {
  entityType: string;
  entityId: string;
  conflictFields: string[];
  resolution: 'server_wins' | 'client_wins' | 'merge' | 'manual';
  serverUpdatedAt?: Date;
  clientUpdatedAt?: Date;
  message?: string;
}

export interface ConflictResolutionResult {
  action: 'accepted' | 'retry' | 'skip';
  userChoice?: 'server' | 'client' | 'merge';
}

/**
 * Conflict logger for debugging and analytics
 */
export class ConflictLogger {
  private static conflicts: SyncConflict[] = [];

  static logConflict(conflict: SyncConflict): void {
    this.conflicts.push(conflict);
    console.log('⚠️  Conflict detected and logged:');
    console.log(`   Type: ${conflict.entityType}`);
    console.log(`   ID: ${conflict.entityId}`);
    console.log(`   Fields: ${conflict.conflictFields.join(', ')}`);
    console.log(`   Resolution: ${conflict.resolution}`);
    console.log(`   Message: ${conflict.message}`);
  }

  static getConflicts(): SyncConflict[] {
    return [...this.conflicts];
  }

  static getConflictCount(): number {
    return this.conflicts.length;
  }

  static clearConflicts(): void {
    this.conflicts = [];
  }

  static getConflictsByType(entityType: string): SyncConflict[] {
    return this.conflicts.filter(c => c.entityType === entityType);
  }

  static getRecentConflicts(limit: number = 10): SyncConflict[] {
    return this.conflicts.slice(-limit);
  }
}

/**
 * Conflict Resolution Service
 */
export class ConflictResolutionService {
  /**
   * Handle a conflict reported by the backend
   */
  static async handleConflict(
    conflict: SyncConflict,
    onConflictDetected?: (conflict: SyncConflict) => Promise<ConflictResolutionResult>
  ): Promise<ConflictResolutionResult> {
    // Log the conflict
    ConflictLogger.logConflict(conflict);

    // Auto-resolve based on strategy
    if (conflict.resolution === 'server_wins' || conflict.resolution === 'merge') {
      // These are auto-resolved by backend
      console.log(`✅ Conflict auto-resolved: ${conflict.resolution}`);
      return {
        action: 'accepted',
      };
    }

    if (conflict.resolution === 'client_wins') {
      // Client wins - retry the sync
      console.log('🔄 Conflict resolution: client_wins - retrying sync');
      return {
        action: 'retry',
        userChoice: 'client',
      };
    }

    // Manual resolution required
    if (onConflictDetected) {
      console.log('👤 Manual conflict resolution required');
      return await onConflictDetected(conflict);
    }

    // Default: accept server resolution
    console.log('⚠️  No conflict handler provided, accepting server resolution');
    return {
      action: 'accepted',
    };
  }

  /**
   * Format conflict for display
   */
  static formatConflictMessage(conflict: SyncConflict): string {
    const lines: string[] = [];

    lines.push('Sync Conflict Detected');
    lines.push('');

    if (conflict.message) {
      lines.push(conflict.message);
      lines.push('');
    }

    lines.push(`Resolution: ${this.formatResolution(conflict.resolution)}`);

    if (conflict.conflictFields.length > 0) {
      lines.push('');
      lines.push('Affected fields:');
      conflict.conflictFields.forEach(field => {
        lines.push(`  • ${this.formatFieldName(field)}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Format resolution strategy for display
   */
  static formatResolution(resolution: string): string {
    switch (resolution) {
      case 'server_wins':
        return 'Server version kept';
      case 'client_wins':
        return 'Your version kept';
      case 'merge':
        return 'Data merged automatically';
      case 'manual':
        return 'Manual resolution required';
      default:
        return resolution;
    }
  }

  /**
   * Format field name for display
   */
  static formatFieldName(field: string): string {
    const fieldNames: Record<string, string> = {
      totalReps: 'Total Reps',
      validReps: 'Valid Reps',
      totalPoints: 'Points',
      durationSeconds: 'Duration',
      isCompleted: 'Completion Status',
    };

    return fieldNames[field] || field;
  }

  /**
   * Check if conflict requires user attention
   */
  static requiresUserAttention(conflict: SyncConflict): boolean {
    return conflict.resolution === 'manual';
  }

  /**
   * Get recommended action text
   */
  static getRecommendedActionText(conflict: SyncConflict): string {
    switch (conflict.resolution) {
      case 'server_wins':
        return 'The server version has been kept. Your local changes were not saved.';
      case 'client_wins':
        return 'Your local version will be uploaded.';
      case 'merge':
        return 'The data has been automatically merged using the highest values.';
      case 'manual':
        return 'Please review and choose which version to keep.';
      default:
        return 'Unknown resolution strategy.';
    }
  }

  /**
   * Generate conflict summary for analytics
   */
  static generateConflictSummary(): {
    total: number;
    byResolution: Record<string, number>;
    byType: Record<string, number>;
    recent: SyncConflict[];
  } {
    const conflicts = ConflictLogger.getConflicts();

    const byResolution = conflicts.reduce((acc, c) => {
      acc[c.resolution] = (acc[c.resolution] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byType = conflicts.reduce((acc, c) => {
      acc[c.entityType] = (acc[c.entityType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: conflicts.length,
      byResolution,
      byType,
      recent: ConflictLogger.getRecentConflicts(5),
    };
  }
}
