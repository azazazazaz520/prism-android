import { describe, expect, it } from 'vitest';
import { getKeyboardInset, getKeyboardLayout } from '../useKeyboardViewport';

describe('getKeyboardInset', () => {
  it('returns the height covered by the keyboard', () => {
    expect(getKeyboardInset(800, 480)).toBe(320);
  });

  it('does not return a negative inset when the viewport is unchanged', () => {
    expect(getKeyboardInset(800, 800)).toBe(0);
  });

  it('accounts for a viewport offset', () => {
    expect(getKeyboardInset(800, 500, 20)).toBe(280);
  });
});

describe('getKeyboardLayout', () => {
  it('uses the visual viewport when Android resizes the WebView', () => {
    expect(getKeyboardLayout(480, 480, 800)).toEqual({
      viewportHeight: 480,
      bottomOffset: 0,
    });
  });

  it('keeps the keyboard offset when Android leaves the layout viewport unchanged', () => {
    expect(getKeyboardLayout(800, 480, 800)).toEqual({
      viewportHeight: 480,
      bottomOffset: 320,
    });
  });
});
