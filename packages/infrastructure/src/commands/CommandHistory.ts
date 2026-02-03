import { Command, CommandResult } from './Command';

/**
 * Configuration options for CommandHistory
 */
export interface CommandHistoryConfig {
  /** Maximum number of commands to keep in history (default: 50) */
  maxHistorySize: number;
  /** Maximum memory usage in bytes (default: 50MB) */
  maxMemoryBytes: number;
  /** Whether to enable memory-aware cleanup (default: true) */
  enableMemoryCleanup: boolean;
  /** Callback when history changes */
  onHistoryChange?: (history: CommandHistoryState) => void;
  /** Callback when a command is executed */
  onCommandExecuted?: (command: Command, result: CommandResult) => void;
  /** Callback when undo is performed */
  onUndo?: (command: Command, result: CommandResult<void>) => void;
  /** Callback when redo is performed */
  onRedo?: (command: Command, result: CommandResult) => void;
}

/**
 * State of the command history
 */
export interface CommandHistoryState {
  /** Number of commands that can be undone */
  undoCount: number;
  /** Number of commands that can be redone */
  redoCount: number;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Total commands in history */
  totalCommands: number;
  /** Estimated memory usage in bytes */
  estimatedMemoryBytes: number;
  /** Description of the last executed command */
  lastCommandDescription?: string;
  /** Description of the next undo command */
  nextUndoDescription?: string;
  /** Description of the next redo command */
  nextRedoDescription?: string;
}

/**
 * Default configuration for CommandHistory
 */
const DEFAULT_CONFIG: CommandHistoryConfig = {
  maxHistorySize: 50,
  maxMemoryBytes: 50 * 1024 * 1024, // 50MB
  enableMemoryCleanup: true,
};

/**
 * CommandHistory manages the undo/redo stack using the Command Pattern
 *
 * Features:
 * - Configurable history size limit
 * - Memory-aware cleanup
 * - Event callbacks for state changes
 * - Transaction support for grouping commands
 */
export class CommandHistory {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private config: CommandHistoryConfig;
  private isExecuting = false;
  private transactionCommands: Command[] | null = null;
  private transactionDescription: string | null = null;

  constructor(config: Partial<CommandHistoryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Execute a command and add it to the history
   * @param command - The command to execute
   * @returns Result of the command execution
   */
  async execute<T>(command: Command<T>): Promise<CommandResult<T>> {
    if (this.isExecuting) {
      return { success: false, error: 'Another command is currently executing' };
    }

    this.isExecuting = true;

    try {
      const result = await Promise.resolve(command.execute());

      if (result.success) {
        // If in a transaction, add to transaction commands
        if (this.transactionCommands !== null) {
          this.transactionCommands.push(command);
        } else {
          // Clear redo stack when new command is executed
          this.clearRedoStack();

          // Add to undo stack
          this.undoStack.push(command);

          // Check and enforce limits
          this.enforceHistoryLimits();
        }

        this.notifyHistoryChange();
        this.config.onCommandExecuted?.(command, result);
      }

      return result;
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Undo the last command
   * @returns Result of the undo operation, or null if nothing to undo
   */
  async undo(): Promise<CommandResult<void> | null> {
    if (this.undoStack.length === 0) {
      return null;
    }

    if (this.isExecuting) {
      return { success: false, error: 'Another command is currently executing' };
    }

    this.isExecuting = true;

    try {
      const command = this.undoStack.pop()!;
      const result = await Promise.resolve(command.undo());

      if (result.success) {
        this.redoStack.push(command);
        this.notifyHistoryChange();
        this.config.onUndo?.(command, result);
      } else {
        // Put command back if undo failed
        this.undoStack.push(command);
      }

      return result;
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Redo the last undone command
   * @returns Result of the redo operation, or null if nothing to redo
   */
  async redo(): Promise<CommandResult | null> {
    if (this.redoStack.length === 0) {
      return null;
    }

    if (this.isExecuting) {
      return { success: false, error: 'Another command is currently executing' };
    }

    this.isExecuting = true;

    try {
      const command = this.redoStack.pop()!;
      const result = command.redo
        ? await Promise.resolve(command.redo())
        : await Promise.resolve(command.execute());

      if (result.success) {
        this.undoStack.push(command);
        this.notifyHistoryChange();
        this.config.onRedo?.(command, result);
      } else {
        // Put command back if redo failed
        this.redoStack.push(command);
      }

      return result;
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Start a transaction - all commands executed during the transaction
   * will be grouped into a single undo/redo operation
   * @param description - Description of the transaction
   */
  beginTransaction(description: string): void {
    if (this.transactionCommands !== null) {
      throw new Error('Transaction already in progress');
    }
    this.transactionCommands = [];
    this.transactionDescription = description;
  }

  /**
   * Commit the current transaction
   */
  async commitTransaction(): Promise<void> {
    if (this.transactionCommands === null) {
      throw new Error('No transaction in progress');
    }

    if (this.transactionCommands.length > 0) {
      // Create a composite command from all transaction commands
      const { CompositeCommand } = await import('./Command');
      const composite = new CompositeCommand(
        this.transactionCommands,
        this.transactionDescription || undefined
      );

      // Clear redo stack and add composite to undo stack
      this.clearRedoStack();
      this.undoStack.push(composite);
      this.enforceHistoryLimits();
      this.notifyHistoryChange();
    }

    this.transactionCommands = null;
    this.transactionDescription = null;
  }

  /**
   * Rollback the current transaction, undoing all commands in it
   */
  async rollbackTransaction(): Promise<void> {
    if (this.transactionCommands === null) {
      throw new Error('No transaction in progress');
    }

    // Undo all transaction commands in reverse order
    for (let i = this.transactionCommands.length - 1; i >= 0; i--) {
      await Promise.resolve(this.transactionCommands[i].undo());
    }

    this.transactionCommands = null;
    this.transactionDescription = null;
  }

  /**
   * Check if a transaction is in progress
   */
  isInTransaction(): boolean {
    return this.transactionCommands !== null;
  }

  /**
   * Get the current state of the history
   */
  getState(): CommandHistoryState {
    return {
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0,
      totalCommands: this.undoStack.length + this.redoStack.length,
      estimatedMemoryBytes: this.estimateMemoryUsage(),
      lastCommandDescription: this.undoStack[this.undoStack.length - 1]?.metadata.description,
      nextUndoDescription: this.undoStack[this.undoStack.length - 1]?.metadata.description,
      nextRedoDescription: this.redoStack[this.redoStack.length - 1]?.metadata.description,
    };
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Clear all history (typically called on document close)
   */
  clear(): void {
    // Dispose all commands
    [...this.undoStack, ...this.redoStack].forEach(cmd => cmd.dispose?.());

    this.undoStack = [];
    this.redoStack = [];
    this.transactionCommands = null;
    this.transactionDescription = null;

    this.notifyHistoryChange();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CommandHistoryConfig>): void {
    this.config = { ...this.config, ...config };
    this.enforceHistoryLimits();
  }

  /**
   * Get the current configuration
   */
  getConfig(): CommandHistoryConfig {
    return { ...this.config };
  }

  /**
   * Get the undo stack (for debugging/testing)
   */
  getUndoStack(): readonly Command[] {
    return [...this.undoStack];
  }

  /**
   * Get the redo stack (for debugging/testing)
   */
  getRedoStack(): readonly Command[] {
    return [...this.redoStack];
  }

  /**
   * Enforce history size and memory limits
   */
  private enforceHistoryLimits(): void {
    // Enforce count limit
    while (this.undoStack.length > this.config.maxHistorySize) {
      const removed = this.undoStack.shift();
      removed?.dispose?.();
    }

    // Enforce memory limit if enabled
    if (this.config.enableMemoryCleanup) {
      while (
        this.undoStack.length > 1 &&
        this.estimateMemoryUsage() > this.config.maxMemoryBytes
      ) {
        const removed = this.undoStack.shift();
        removed?.dispose?.();
      }
    }
  }

  /**
   * Estimate total memory usage of all commands
   */
  private estimateMemoryUsage(): number {
    const undoMemory = this.undoStack.reduce(
      (total, cmd) => total + (cmd.estimateMemorySize?.() || 1024),
      0
    );
    const redoMemory = this.redoStack.reduce(
      (total, cmd) => total + (cmd.estimateMemorySize?.() || 1024),
      0
    );
    return undoMemory + redoMemory;
  }

  /**
   * Clear the redo stack and dispose commands
   */
  private clearRedoStack(): void {
    this.redoStack.forEach(cmd => cmd.dispose?.());
    this.redoStack = [];
  }

  /**
   * Notify listeners of history state change
   */
  private notifyHistoryChange(): void {
    this.config.onHistoryChange?.(this.getState());
  }
}

/**
 * Create a CommandHistory instance with default configuration
 */
export function createCommandHistory(
  config?: Partial<CommandHistoryConfig>
): CommandHistory {
  return new CommandHistory(config);
}
