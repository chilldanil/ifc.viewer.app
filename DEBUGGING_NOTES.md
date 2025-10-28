# Property Editor Debugging Notes

## Issue
PropertyEditor shows "No element selected" even after clicking elements in the 3D viewer.

## Root Cause
The highlighter event handler (`onHighlight`) is not being triggered when elements are clicked.

## Console Log Evidence
- ✅ "Highlighter setup successful" - Highlighter is initialized
- ✅ "PropertyEditor props updated" - Component is mounted
- ❌ "=== Element Selection Event ===" - Never appears (event not firing)
- ❌ "Checking highlighter events" - Never appears (setupEventHandlers not running)

## Hypothesis
The `setupEventHandlers()` function in Sidebar.tsx is not being called, or the highlighter events don't exist yet.

## Next Steps
1. Test if `npm start` shows more console logs with the added debugging
2. Click an element and check for new log messages
3. If still no logs, the Viewport might not be passing selection events correctly
4. Alternative: Use the Viewport's `onObjectSelected` prop callback instead of highlighter events
