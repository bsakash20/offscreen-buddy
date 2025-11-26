/**
 * Contextual Error Resolution System
 * Main entry point for the contextual error description and resolution system
 */

// Types
export * from './types/ContextualResolutionTypes';

// Services
export { ContextualDescriptionGenerator } from './services/ContextualDescriptionGenerator';
export { ResolutionGuidanceEngine } from './services/ResolutionGuidanceEngine';
export { SmartRecommendationEngine } from './services/SmartRecommendationEngine';
export { ContextualResolutionManager } from './services/ContextualResolutionManager';

// Components
export { ResolutionWorkflow } from './components/ResolutionWorkflow';

// Default exports
export { default as contextualDescriptionGenerator } from './services/ContextualDescriptionGenerator';
export { default as resolutionGuidanceEngine } from './services/ResolutionGuidanceEngine';
export { default as smartRecommendationEngine } from './services/SmartRecommendationEngine';
export { default as contextualResolutionManager } from './services/ContextualResolutionManager';