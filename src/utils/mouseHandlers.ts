import type { SelectRenderable, MouseEvent } from "@opentui/core";

/**
 * onMouseDown handler for <select> elements.
 *
 * MUST be a regular `function` (not an arrow function) because opentui calls
 * mouse handlers via `.call(this, event)` where `this` is the SelectRenderable
 * instance. Arrow functions capture `this` lexically and would ignore the binding.
 *
 * When the user clicks on a SelectRenderable, opentui has no built-in item
 * selection logic — it only auto-focuses the element. This handler calculates
 * which item the user clicked (using the element's scroll offset, per-item
 * line height, and the click's local Y coordinate), then calls:
 *
 *   - `setSelectedIndex(idx)`  → emits SELECTION_CHANGED → triggers `onChange`
 *   - `selectCurrent()`        → emits ITEM_SELECTED    → triggers `onSelect`
 *
 * The `onChange` callback (wired in App.tsx) dispatches `{ activePane, selectedXIndex }`
 * so React state is updated before the next render, preventing the race condition
 * where React would re-render with `focused={false}` and immediately undo
 * opentui's auto-focus.
 */
export const selectMouseDown: (this: SelectRenderable, event: MouseEvent) => void =
  function (this: SelectRenderable, event: MouseEvent) {
    // Access private runtime fields via `any` — they are not in the public API
    // but are stable implementation details of SelectRenderable.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const self = this as any;

    const rendererY: number = self.y as number;
    const scrollOffset: number = (self.scrollOffset as number) || 0;
    const linesPerItem: number = (self.linesPerItem as number) || 1;

    const localY = event.y - rendererY;
    const clickedIndex = scrollOffset + Math.floor(localY / linesPerItem);
    const clampedIndex = Math.max(0, Math.min(clickedIndex, this.options.length - 1));

    this.setSelectedIndex(clampedIndex);
    this.selectCurrent();
  };
