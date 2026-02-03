/**
 * Text module exports
 */

export * from './extraction';

// E4: Font embedding/subsetting
export {
  FontEmbeddingService,
  fontEmbeddingService,
  FontSubsetter,
} from './fontEmbedding';
export type {
  FontEmbeddingOptions,
  FontUsage,
  FontEmbeddingResult,
} from './fontEmbedding';
