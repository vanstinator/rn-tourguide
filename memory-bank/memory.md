# Project Memory

## Tooltip Offset Issue
- The tooltip sometimes overlaps the wrapped component.
- The offset calculation should consider the tooltip's size and position.
- Priority rules for tooltip placement:
  1. If the tooltip would overflow the top or bottom of the screen, clamp its position to stay within the screen.
  2. Otherwise, calculate the tooltip's location and size, and ensure a consistent distance from the top or bottom of the wrapped component, regardless of tooltip content length.
- Goal: Tooltips should feel consistent and not overlap the target component, even if the tooltip body text is long or short.

## Tooltip Placement Logic (Modal.tsx)
- The `_animateMove` method in `Modal.tsx` is responsible for tooltip placement.
- It measures the tooltip height and the target position, then calculates the Y offset.
- Uses `MARGIN` (13) for spacing.
- Clamps the tooltip position between `minY` (safe area top) and `maxY` (screen height - tooltip height - safe area bottom).
- If the tooltip would overflow, it is clamped; otherwise, it is placed a consistent distance from the target.
- Tooltip height is measured via `handleTooltipLayout` and stored in state.
- Tooltip width is set to 80% in styles.

## Next Steps
- Refactor `_animateMove` to ensure the tooltip is always a consistent distance from the target unless clamping is required.
- Ensure the tooltip never overlaps the target, regardless of tooltip content length.
- Consider both top and bottom overflow, and always use the measured tooltip height for calculations.
