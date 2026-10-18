/**
 * Re-export: the implementation lives in `modules/_shared` so other modules
 * (skills vetting, …) can resolve a feature's model without importing the
 * settings module (forbidden by the `no-cross-module-imports` rule).
 */
export {
  defaultFeatureModel,
  getFeatureModelOverride,
  resolveFeatureModel,
} from '../_shared/feature-models.js';
