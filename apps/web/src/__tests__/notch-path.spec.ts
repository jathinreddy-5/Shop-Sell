import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import {
  generateNotchPath,
  springEase,
  DEFAULT_NOTCH_CONFIG,
} from '../components/liquid-nav/notch-path.ts';

describe('LiquidNav Notch Path Generator & Motion Suite', () => {
  const width = 360;
  const height = 64;
  const radius = DEFAULT_NOTCH_CONFIG.radius;
  const depth = DEFAULT_NOTCH_CONFIG.depth;

  it('should generate valid SVG path for bottom variant at the first item', () => {
    // 5 items across 360px: centers at 36, 108, 180, 252, 324
    const firstItemCenter = 36;
    const path = generateNotchPath({
      variant: 'bottom',
      width,
      height,
      center: firstItemCenter,
      notchRadius: radius,
      notchDepth: depth,
    });

    assert.ok(path.startsWith('M 0 0'));
    assert.ok(path.endsWith('Z'));
    // Contains center coordinate and depth
    assert.ok(path.includes(`${firstItemCenter.toFixed(2)} ${depth.toFixed(2)}`));
    // Contains shoulders around first item
    assert.ok(path.includes((firstItemCenter - radius).toFixed(2)));
    assert.ok(path.includes((firstItemCenter + radius).toFixed(2)));
  });

  it('should generate valid SVG path for bottom variant at the last item', () => {
    const lastItemCenter = 324;
    const path = generateNotchPath({
      variant: 'bottom',
      width,
      height,
      center: lastItemCenter,
      notchRadius: radius,
      notchDepth: depth,
    });

    assert.ok(path.startsWith('M 0 0'));
    assert.ok(path.endsWith('Z'));
    assert.ok(path.includes(`${lastItemCenter.toFixed(2)} ${depth.toFixed(2)}`));
    assert.ok(path.includes((lastItemCenter - radius).toFixed(2)));
    assert.ok(path.includes((lastItemCenter + radius).toFixed(2)));
  });

  it('should generate valid SVG path for top variant at first and last items', () => {
    const firstCenter = 40;
    const lastCenter = 320;

    const pathFirst = generateNotchPath({
      variant: 'top',
      width,
      height,
      center: firstCenter,
      notchRadius: radius,
      notchDepth: depth,
    });

    const pathLast = generateNotchPath({
      variant: 'top',
      width,
      height,
      center: lastCenter,
      notchRadius: radius,
      notchDepth: depth,
    });

    assert.ok(pathFirst.startsWith('M 0 0'));
    assert.ok(pathFirst.endsWith('Z'));
    assert.ok(pathFirst.includes(`${firstCenter.toFixed(2)} ${(height - depth).toFixed(2)}`));

    assert.ok(pathLast.startsWith('M 0 0'));
    assert.ok(pathLast.endsWith('Z'));
    assert.ok(pathLast.includes(`${lastCenter.toFixed(2)} ${(height - depth).toFixed(2)}`));
  });

  it('should generate valid SVG path for side variant at first and last items', () => {
    const railWidth = 72;
    const railHeight = 400;
    const firstCenter = 40;
    const lastCenter = 360;

    const pathFirst = generateNotchPath({
      variant: 'side',
      width: railWidth,
      height: railHeight,
      center: firstCenter,
      notchRadius: radius,
      notchDepth: depth,
    });

    const pathLast = generateNotchPath({
      variant: 'side',
      width: railWidth,
      height: railHeight,
      center: lastCenter,
      notchRadius: radius,
      notchDepth: depth,
    });

    assert.ok(pathFirst.startsWith('M 0 0'));
    assert.ok(pathFirst.endsWith('Z'));
    assert.ok(pathFirst.includes(`${(railWidth - depth).toFixed(2)} ${firstCenter.toFixed(2)}`));

    assert.ok(pathLast.startsWith('M 0 0'));
    assert.ok(pathLast.endsWith('Z'));
    assert.ok(pathLast.includes(`${(railWidth - depth).toFixed(2)} ${lastCenter.toFixed(2)}`));
  });

  it('should stretch notch width dynamically during jumps', () => {
    const normalPath = generateNotchPath({
      variant: 'bottom',
      width,
      height,
      center: 180,
      notchRadius: 38,
      stretch: 1.0,
    });

    const stretchedPath = generateNotchPath({
      variant: 'bottom',
      width,
      height,
      center: 180,
      notchRadius: 38,
      stretch: 1.35,
    });

    // Stretched notch starts earlier than normal notch
    const normalStart = (180 - 38).toFixed(2);
    const stretchedStart = (180 - 38 * 1.35).toFixed(2);

    assert.ok(normalPath.includes(normalStart));
    assert.ok(stretchedPath.includes(stretchedStart));
  });

  it('should implement spring easing with characteristic overshoot and settling at 1', () => {
    assert.strictEqual(springEase(0), 0);
    assert.strictEqual(springEase(1), 1);

    // Spring curve overshoots around t = 0.5 to 0.7
    let maxVal = 0;
    for (let t = 0.1; t < 1.0; t += 0.05) {
      const v = springEase(t);
      if (v > maxVal) maxVal = v;
    }

    assert.ok(maxVal > 1.0, `Expected spring easing to overshoot 1.0, got ${maxVal}`);
    assert.ok(maxVal < 1.3, `Expected spring overshoot to stay controlled, got ${maxVal}`);
  });
});
