# Color Scheme UX Update

## Overview
Updated the Data Range Gradient rule editor to use Grafana's built-in UI pattern for color scheme selection, replacing the plain dropdown with an interactive menu button that displays gradient previews.

## Changes Made

### Component: DataRangeGradientRuleEditor.tsx

#### 1. Updated Imports
Added necessary components from @grafana/ui:
- `Menu` - For dropdown menu functionality
- `ToolbarButton` - For the button trigger that matches Grafana's UI patterns
- `useState` - For managing menu state (imported but available for future use)

#### 2. Updated Styles
Replaced the preview container styles with new styles for the color scheme button:

```typescript
colorSchemeButton: css`
  width: 100%;
  justify-content: flex-start;
  padding: ${theme.spacing(1)};
`,
menuGradient: css`
  height: 20px;
  width: 100%;
  border-radius: ${theme.shape.radius.default};
  margin-right: ${theme.spacing(1)};
  flex-shrink: 0;
`,
menuItemContent: css`
  display: flex;
  align-items: center;
  width: 100%;
  gap: ${theme.spacing(1)};
`,
menuItemLabel: css`
  flex: 1;
`,
```

#### 3. New Helper Functions

**generateGradientCSS(schemeId: string)**
- Generates a CSS gradient string for a given color scheme
- Creates 50 color stops for smooth gradient rendering
- Used for both menu items and the button display

**selectedSchemeLabel**
- Computed value that finds and displays the label for the currently selected color scheme
- Falls back to "Select color scheme" if none selected

#### 4. Replaced UI Component

**Before:** Plain Select dropdown
```tsx
<Combobox
  options={colorSchemeOptions}
  value={rule.dataRangeColorScheme}
  onChange={updateColorScheme}
  placeholder="Select color scheme"
  width={40}
/>
```

**After:** Menu with ToolbarButton trigger
```tsx
<Menu
  renderMenuItems={() => (
    <>
      {colorSchemeOptions.map((scheme) => (
        <Menu.Item
          key={scheme.value}
          label={
            <div className={styles.menuItemContent}>
              <div
                className={styles.menuGradient}
                style={{
                  background: generateGradientCSS(scheme.value!),
                  width: '120px',
                }}
              />
              <span className={styles.menuItemLabel}>{scheme.label}</span>
            </div>
          }
          onClick={() => updateColorScheme(scheme)}
        />
      ))}
    </>
  )}
>
  {(props) => (
    <ToolbarButton
      {...props}
      className={styles.colorSchemeButton}
      variant="canvas"
      icon="palette"
    >
      {rule.dataRangeColorScheme ? (
        <div className={styles.menuItemContent}>
          <div
            className={styles.menuGradient}
            style={{
              background: generateGradientCSS(rule.dataRangeColorScheme),
              width: '120px',
            }}
          />
          <span>{selectedSchemeLabel}</span>
        </div>
      ) : (
        'Select color scheme'
      )}
    </ToolbarButton>
  )}
</Menu>
```

## UX Improvements

1. **Visual Gradient Previews**: Each color scheme now shows a live gradient preview in the menu
2. **Grafana-Native UI**: Uses ToolbarButton and Menu components that match Grafana's design system
3. **Better Discoverability**: Users can see what each color scheme looks like before selecting it
4. **Consistent Experience**: Matches the pattern used in Grafana's heatmap and flamegraph panels
5. **Icon Support**: Palette icon provides visual cue for color-related functionality

## Technical Notes

- The Menu component uses a render prop pattern for the button trigger
- Each menu item displays a 120px gradient bar alongside the scheme name
- The button displays the selected gradient or placeholder text
- Gradients are generated on-the-fly using the existing `getColorFromScheme()` utility
- All 10 working color schemes (GrYlRd, RdYlGr, BlYlRd, YlRd, BlPu, YlBl, Blues, Reds, Greens, Purples) are supported

## Build Status
✅ Build successful with no errors or warnings
