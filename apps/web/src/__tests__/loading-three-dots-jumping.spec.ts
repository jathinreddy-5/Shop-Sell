import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import {
  LOADER_COLORS,
  DEFAULT_LOADER_CONFIG,
  getContainerGeometry,
  getStaggerDelay,
} from '../components/loading/types.ts';

describe('LoadingThreeDotsJumping Specification Suite', () => {
  it('should define accurate color tokens conforming to design guidelines', () => {
    assert.strictEqual(LOADER_COLORS.primary, '#6C63FF');
    assert.strictEqual(LOADER_COLORS.light, '#6C63FF');
    assert.strictEqual(LOADER_COLORS.dark, '#FFFFFF');
    assert.strictEqual(LOADER_COLORS.accent, '#FFD60A');
  });

  it('should configure sensible defaults matching the specification', () => {
    assert.strictEqual(DEFAULT_LOADER_CONFIG.duration, 0.8);
    assert.strictEqual(DEFAULT_LOADER_CONFIG.jumpHeight, 30);
    assert.strictEqual(DEFAULT_LOADER_CONFIG.size, 16);
    assert.strictEqual(DEFAULT_LOADER_CONFIG.gap, 8);
    assert.strictEqual(DEFAULT_LOADER_CONFIG.label, 'Loading');
  });

  it('should calculate zero-shift container geometry with reserved clearance', () => {
    const geo = getContainerGeometry(20, 30, 8);
    assert.strictEqual(geo.minHeight, 50);
    assert.strictEqual(geo.paddingTop, 30);
    assert.strictEqual(geo.gap, '8px');

    const defaultGeo = getContainerGeometry(
      DEFAULT_LOADER_CONFIG.size,
      DEFAULT_LOADER_CONFIG.jumpHeight,
      DEFAULT_LOADER_CONFIG.gap
    );
    assert.strictEqual(defaultGeo.minHeight, 46);
    assert.strictEqual(defaultGeo.paddingTop, 30);
    assert.strictEqual(defaultGeo.gap, '8px');
  });

  it('should calculate staggered delays sequentially to maintain smooth wave loops', () => {
    const delay0 = getStaggerDelay(0, 0.8, 0.2);
    const delay1 = getStaggerDelay(1, 0.8, 0.2);
    const delay2 = getStaggerDelay(2, 0.8, 0.2);

    assert.strictEqual(delay0, 0);
    assert.strictEqual(delay1, 0.16);
    assert.strictEqual(delay2, 0.32);
  });
});
