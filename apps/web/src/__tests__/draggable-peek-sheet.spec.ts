import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import {
  getSnapTranslateY,
  resolveSnapPoint,
  DEFAULT_SHEET_DIMENSIONS,
} from '../components/peek-sheet/sheet-motion.ts';
import type { SheetDimensions } from '../components/peek-sheet/sheet-motion.ts';

describe('Draggable Peek Sheet Motion & Snap Physics Suite', () => {
  const customDims: SheetDimensions = {
    containerHeight: 600,
    peekHeight: 80,
    halfRatio: 0.5,
    fullRatio: 0.9,
  };

  it('calculates correct translateY offsets for each snap state', () => {
    // fullHeight = 600 * 0.9 = 540
    // halfHeight = 600 * 0.5 = 300
    // full: 0
    assert.strictEqual(getSnapTranslateY('full', customDims), 0);
    // half: 540 - 300 = 240
    assert.strictEqual(getSnapTranslateY('half', customDims), 240);
    // peek: 540 - 80 = 460
    assert.strictEqual(getSnapTranslateY('peek', customDims), 460);
    // closed: 540 + 40 = 580
    assert.strictEqual(getSnapTranslateY('closed', customDims), 580);
  });

  it('snaps up on upward flick velocity (negative velocity)', () => {
    // From closed -> peek on upward flick
    const fromClosed = resolveSnapPoint({
      currentTranslateY: 580,
      velocityY: -450,
      currentSnap: 'closed',
      dims: customDims,
    });
    assert.strictEqual(fromClosed, 'peek');

    // From peek -> half on upward flick
    const fromPeek = resolveSnapPoint({
      currentTranslateY: 460,
      velocityY: -500,
      currentSnap: 'peek',
      dims: customDims,
    });
    assert.strictEqual(fromPeek, 'half');

    // From half -> full on upward flick
    const fromHalf = resolveSnapPoint({
      currentTranslateY: 240,
      velocityY: -400,
      currentSnap: 'half',
      dims: customDims,
    });
    assert.strictEqual(fromHalf, 'full');
  });

  it('snaps down on downward flick velocity (positive velocity)', () => {
    // From full -> half on downward flick
    const fromFull = resolveSnapPoint({
      currentTranslateY: 0,
      velocityY: 450,
      currentSnap: 'full',
      dims: customDims,
    });
    assert.strictEqual(fromFull, 'half');

    // From half -> peek on downward flick
    const fromHalf = resolveSnapPoint({
      currentTranslateY: 240,
      velocityY: 450,
      currentSnap: 'half',
      dims: customDims,
    });
    assert.strictEqual(fromHalf, 'peek');

    // From peek -> closed if allowClose is true
    const fromPeekClose = resolveSnapPoint({
      currentTranslateY: 460,
      velocityY: 450,
      currentSnap: 'peek',
      dims: customDims,
      allowClose: true,
    });
    assert.strictEqual(fromPeekClose, 'closed');

    // From peek -> stays peek if allowClose is false
    const fromPeekStay = resolveSnapPoint({
      currentTranslateY: 460,
      velocityY: 450,
      currentSnap: 'peek',
      dims: customDims,
      allowClose: false,
    });
    assert.strictEqual(fromPeekStay, 'peek');
  });

  it('resolves closest positional snap point when released with low velocity', () => {
    // target offsets: full = 0, half = 240, peek = 460
    
    // Position 50px is closer to full (0) than half (240)
    const nearFull = resolveSnapPoint({
      currentTranslateY: 50,
      velocityY: 0,
      currentSnap: 'half',
      dims: customDims,
    });
    assert.strictEqual(nearFull, 'full');

    // Position 220px is closer to half (240)
    const nearHalf = resolveSnapPoint({
      currentTranslateY: 220,
      velocityY: 50,
      currentSnap: 'half',
      dims: customDims,
    });
    assert.strictEqual(nearHalf, 'half');

    // Position 420px is closer to peek (460)
    const nearPeek = resolveSnapPoint({
      currentTranslateY: 420,
      velocityY: -20,
      currentSnap: 'peek',
      dims: customDims,
    });
    assert.strictEqual(nearPeek, 'peek');
  });

  it('works with default dimensions safely', () => {
    const fullY = getSnapTranslateY('full');
    const peekY = getSnapTranslateY('peek');
    assert.ok(peekY > fullY);

    const snap = resolveSnapPoint({
      currentTranslateY: 100,
      velocityY: 0,
      currentSnap: 'peek',
    });
    assert.ok(['full', 'half', 'peek', 'closed'].includes(snap));
  });
});
