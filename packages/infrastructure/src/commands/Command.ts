/**
 * Command Interface - Core of the Command Pattern for Undo/Redo
 *
 * Each command encapsulates an action that can be executed and undone.
 * Commands should be immutable and contain all necessary state to
 * perform both execution and undo operations.
 */

/**
 * Metadata associated with a command for tracking and debugging
 */
export interface CommandMetadata {
  /** Unique identifier for the command instance */
  id: string;
  /** Human-readable description of what the command does */
  description: string;
  /** Timestamp when the command was created */
  createdAt: Date;
  /** Timestamp when the command was last executed */
  executedAt?: Date;
  /** Optional category for grouping related commands */
  category?: string;
  /** Whether this command can be merged with subsequent similar commands */
  mergeable?: boolean;
}

/**
 * Result of command execution
 */
export interface CommandResult<T = unknown> {
  /** Whether the command executed successfully */
  success: boolean;
  /** Optional data returned from execution */
  data?: T;
  /** Error message if execution failed */
  error?: string;
}

/**
 * Command interface that all commands must implement
 *
 * @template T - Type of data returned from execute
 * @template S - Type of state snapshot for undo
 */
export interface Command<T = unknown, S = unknown> {
  /** Metadata for the command */
  readonly metadata: CommandMetadata;

  /**
   * Execute the command
   * @returns Result of the execution
   */
  execute(): CommandResult<T> | Promise<CommandResult<T>>;

  /**
   * Undo the command, restoring previous state
   * @returns Result of the undo operation
   */
  undo(): CommandResult<void> | Promise<CommandResult<void>>;

  /**
   * Optional: Redo the command after it has been undone
   * If not implemented, execute() will be called instead
   * @returns Result of the redo operation
   */
  redo?(): CommandResult<T> | Promise<CommandResult<T>>;

  /**
   * Get a snapshot of the state before execution
   * Used for complex undo operations
   */
  getStateSnapshot?(): S;

  /**
   * Restore state from a snapshot
   * @param snapshot - The state snapshot to restore
   */
  restoreFromSnapshot?(snapshot: S): void;

  /**
   * Check if this command can be merged with another command
   * Useful for combining rapid successive changes (e.g., typing)
   * @param other - The command to potentially merge with
   * @returns true if the commands can be merged
   */
  canMergeWith?(other: Command): boolean;

  /**
   * Merge this command with another command
   * @param other - The command to merge with
   * @returns A new merged command
   */
  mergeWith?(other: Command): Command;

  /**
   * Estimate the memory size of this command in bytes
   * Used for memory-aware cleanup
   */
  estimateMemorySize?(): number;

  /**
   * Cleanup any resources held by the command
   * Called when the command is removed from history
   */
  dispose?(): void;
}

/**
 * Abstract base class for commands providing common functionality
 */
export abstract class BaseCommand<T = unknown, S = unknown> implements Command<T, S> {
  public readonly metadata: CommandMetadata;

  constructor(description: string, category?: string, mergeable?: boolean) {
    this.metadata = {
      id: this.generateId(),
      description,
      createdAt: new Date(),
      category,
      mergeable,
    };
  }

  /**
   * Generate a unique ID for the command
   */
  private generateId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  abstract execute(): CommandResult<T> | Promise<CommandResult<T>>;
  abstract undo(): CommandResult<void> | Promise<CommandResult<void>>;

  /**
   * Default redo implementation calls execute
   */
  redo(): CommandResult<T> | Promise<CommandResult<T>> {
    return this.execute();
  }

  /**
   * Default memory estimation (1KB base + description length)
   */
  estimateMemorySize(): number {
    return 1024 + (this.metadata.description.length * 2);
  }

  /**
   * Default dispose - no-op
   */
  dispose(): void {
    // Override in subclasses if cleanup is needed
  }

  /**
   * Helper to create a successful result
   */
  protected success<R>(data?: R): CommandResult<R> {
    return { success: true, data };
  }

  /**
   * Helper to create a failed result
   */
  protected failure(error: string): CommandResult<never> {
    return { success: false, error };
  }
}

/**
 * Composite command that groups multiple commands into one
 * All child commands are executed/undone together
 */
export class CompositeCommand extends BaseCommand<void[], void> {
  private commands: Command[];
  private executedCommands: Command[] = [];

  constructor(commands: Command[], description?: string) {
    super(
      description || `Composite: ${commands.map(c => c.metadata.description).join(', ')}`,
      'composite'
    );
    this.commands = [...commands];
  }

  async execute(): Promise<CommandResult<void[]>> {
    this.executedCommands = [];
    const results: void[] = [];

    for (const command of this.commands) {
      const result = await Promise.resolve(command.execute());
      if (!result.success) {
        // Rollback executed commands on failure
        await this.rollback();
        return this.failure(`Command "${command.metadata.description}" failed: ${result.error}`);
      }
      this.executedCommands.push(command);
      results.push(undefined);
    }

    return this.success(results);
  }

  async undo(): Promise<CommandResult<void>> {
    // Undo in reverse order
    for (let i = this.executedCommands.length - 1; i >= 0; i--) {
      const result = await Promise.resolve(this.executedCommands[i].undo());
      if (!result.success) {
        return this.failure(`Undo failed for "${this.executedCommands[i].metadata.description}": ${result.error}`);
      }
    }
    return this.success();
  }

  private async rollback(): Promise<void> {
    for (let i = this.executedCommands.length - 1; i >= 0; i--) {
      await Promise.resolve(this.executedCommands[i].undo());
    }
    this.executedCommands = [];
  }

  estimateMemorySize(): number {
    return this.commands.reduce(
      (total, cmd) => total + (cmd.estimateMemorySize?.() || 1024),
      1024
    );
  }

  dispose(): void {
    this.commands.forEach(cmd => cmd.dispose?.());
    this.executedCommands = [];
  }
}
