# Screenshot Automation Guide

## Overview

The Enhanced Grid Panel includes a Playwright-based screenshot automation script to capture documentation screenshots consistently whenever the UI changes.

## Prerequisites

- Node.js and npm installed
- Project dependencies installed (`npm install`)
- Docker running (for Grafana instance)

## Quick Start

### 1. Start Grafana Development Server

```bash
npm run server
```

This starts a Grafana instance on http://localhost:3000 with the plugin loaded.

### 2. Run Screenshot Script

In a new terminal:

```bash
npm run e2e -- tests/screenshots.spec.ts
```

### 3. Collect Screenshots

Screenshots will be saved to `tests/screenshots/` directory:

```
tests/screenshots/
├── 01-panel-overview.png
├── 02-column-filter-dropdown.png
├── 03-pagination-controls.png
├── 04-highlight-rules-config.png
├── 05-condition-builder.png
├── 06-nested-condition-groups.png
├── 07-server-side-settings.png
├── 08-threshold-rule.png
├── 09-value-mapping-rule.png
├── 10-data-range-gradient.png
├── 11-sparkchart-config.png
├── 12-flags-column.png
└── 13-colored-cells.png
```

### 4. Copy to Documentation

```bash
# Create screenshots directory in docs
mkdir -p docs/screenshots

# Copy screenshots
cp tests/screenshots/*.png docs/screenshots/
```

## Screenshot List

The script captures the following screenshots for documentation:

### Panel Overview

- **File:** `01-panel-overview.png`
- **Shows:** Full panel with data grid, headers, and basic layout
- **Used in:** README.md hero image

### Column Filtering

- **File:** `02-column-filter-dropdown.png`
- **Shows:** Filter dropdown with operator selection and value input
- **Used in:** README.md features, FEATURES.md column filtering section

### Pagination Controls

- **File:** `03-pagination-controls.png`
- **Shows:** Pagination bar with page numbers, next/previous buttons
- **Used in:** FEATURES.md pagination section

### Highlight Rules Configuration

- **File:** `04-highlight-rules-config.png`
- **Shows:** Panel settings sidebar with highlight rules section
- **Used in:** README.md features, FEATURES.md highlighting section

### Condition Builder UI

- **File:** `05-condition-builder.png`
- **Shows:** Condition builder interface for creating new rules
- **Used in:** FEATURES.md condition configuration

### Nested Condition Groups

- **File:** `06-nested-condition-groups.png`
- **Shows:** Visual hierarchy of nested AND/OR condition groups
- **Used in:** README.md features, FEATURES.md nested conditions

### Server-Side Settings

- **File:** `07-server-side-settings.png`
- **Shows:** Server-side mode configuration panel
- **Used in:** README.md features, SERVER_SIDE_SETUP.md

### Threshold Rule Example

- **File:** `08-threshold-rule.png`
- **Shows:** Threshold rule editor with value ranges and colors
- **Used in:** FEATURES.md threshold rules

### Value Mapping Rule

- **File:** `09-value-mapping-rule.png`
- **Shows:** Value mapping editor with value-to-color mappings
- **Used in:** FEATURES.md value mapping

### Data Range Gradient

- **File:** `10-data-range-gradient.png`
- **Shows:** Gradient rule editor with color scheme selector
- **Used in:** FEATURES.md gradient rules

### SparkChart Configuration

- **File:** `11-sparkchart-config.png`
- **Shows:** SparkChart rule editor
- **Used in:** FEATURES.md sparkchart section

### Flags Column Example

- **File:** `12-flags-column.png`
- **Shows:** Flags column with icon indicators
- **Used in:** FEATURES.md flags column

### Colored Cells Example

- **File:** `13-colored-cells.png`
- **Shows:** Grid with various cell highlighting applied
- **Used in:** README.md examples section

## Customizing Screenshots

### Modify Existing Screenshots

Edit `tests/screenshots.spec.ts` to adjust:

- Wait times (if UI takes longer to load)
- Selectors (if UI elements change)
- Screenshot regions (full page vs. specific element)

Example:

```typescript
test('02 - Column Filtering', async ({ gotoPanelEditPage, readProvisionedDashboard, page }) => {
  const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
  const panelEditPage = await gotoPanelEditPage({ dashboard, id: '1' });

  // Adjust wait time if needed
  await page.waitForTimeout(2000); // Increased from 1000ms

  // Update selector if UI changes
  const filterButton = page.locator('[data-testid="filter-button"]').first();
  if (await filterButton.isVisible()) {
    await filterButton.click();
    await page.waitForTimeout(500);

    // Capture specific region instead of full page
    await page.screenshot({
      path: 'tests/screenshots/02-column-filter-dropdown.png',
      clip: { x: 0, y: 100, width: 800, height: 400 }, // Custom region
    });
  }
});
```

### Add New Screenshots

Add new test cases to capture additional screenshots:

```typescript
test('14 - New Feature', async ({ gotoPanelEditPage, readProvisionedDashboard, page }) => {
  const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
  const panelEditPage = await gotoPanelEditPage({ dashboard, id: '1' });

  await page.waitForTimeout(1000);

  // Navigate to your feature
  const featureButton = page.locator('button:has-text("New Feature")');
  await featureButton.click();

  // Capture screenshot
  await page.screenshot({
    path: 'tests/screenshots/14-new-feature.png',
    fullPage: false,
  });
});
```

## Troubleshooting

### Screenshots are blank or incorrect

**Issue:** Panel not fully loaded before screenshot
**Solution:** Increase wait time

```typescript
await page.waitForTimeout(2000); // Increase from 1000ms
```

### UI elements not found

**Issue:** Selectors don't match actual elements
**Solution:** Inspect elements and update selectors

```typescript
// Use data-testid attributes (recommended)
const button = page.locator('[data-testid="my-button"]');

// Or use text content
const button = page.locator('button:has-text("Click Me")');

// Or use CSS selectors
const button = page.locator('.my-button-class');
```

### Screenshots capture wrong area

**Issue:** Need to capture specific region
**Solution:** Use `clip` option

```typescript
await page.screenshot({
  path: 'output.png',
  clip: { x: 100, y: 100, width: 600, height: 400 },
});
```

### Grafana not running

**Issue:** `npm run e2e` fails with connection error
**Solution:** Start Grafana first

```bash
# Terminal 1
npm run server

# Wait for Grafana to start, then in Terminal 2
npm run e2e -- tests/screenshots.spec.ts
```

## Best Practices

1. **Consistent Data:** Use the same provisioned dashboard data for all screenshots
2. **Clean UI:** Hide development tools, clear console before capturing
3. **Annotations:** Add arrows or highlights in image editor after capture if needed
4. **Optimization:** Compress PNG files before committing
5. **Documentation:** Update this file when adding new screenshots
6. **Version Control:** Commit screenshots with feature changes

## Manual Screenshot Guide (Recommended)

The automated screenshots require extensive panel configuration. For release documentation, **manual screenshots are recommended** for better control and accuracy.

### Setup Instructions

1. Start Grafana: `npm run server`
2. Open http://localhost:3000
3. Create a test dashboard with Enhanced Grid panel
4. Add sample data source
5. Follow the checklist below

### Screenshot Checklist

#### 01-panel-overview.png

- **What to show:** Full panel with data grid
- **Steps:**
  1. Add Enhanced Grid panel to dashboard
  2. Configure data source with sample data (10+ rows, 5+ columns)
  3. Ensure grid is fully visible
  4. Screenshot: Full panel area
- **Size:** ~1200px wide
- **Used in:** README.md hero image

#### 02-column-filter-dropdown.png

- **What to show:** Filter dropdown UI
- **Steps:**
  1. Hover over a column header
  2. Click the filter icon/button
  3. Ensure dropdown is open showing operators and value inputs
  4. Screenshot: Column header + dropdown
- **Size:** ~400px wide
- **Used in:** README.md, FEATURES.md

#### 03-pagination-controls.png

- **What to show:** Pagination bar
- **Steps:**
  1. Enable pagination in panel settings (Page size: 10)
  2. Add 20+ rows of data
  3. Screenshot: Bottom pagination bar showing page numbers, next/prev buttons
- **Size:** ~600px wide
- **Used in:** FEATURES.md

#### 04-highlight-rules-config.png

- **What to show:** Panel settings sidebar with Highlight Rules section
- **Steps:**
  1. Enter panel edit mode
  2. Scroll to "Highlight Rules" section in sidebar
  3. Show at least 2-3 configured rules in the list
  4. Screenshot: Full sidebar focusing on Highlight Rules section
- **Size:** ~400px wide, full height
- **Used in:** README.md, FEATURES.md

#### 05-condition-builder.png

- **What to show:** Condition builder interface
- **Steps:**
  1. In Highlight Rules, click "Add Rule"
  2. Expand the conditions section
  3. Show the condition builder with field selector, operator dropdown, value input
  4. Screenshot: The condition configuration area
- **Size:** ~600px wide
- **Used in:** FEATURES.md

#### 06-nested-condition-groups.png

- **What to show:** Visual hierarchy of nested AND/OR groups
- **Steps:**
  1. Create a rule with nested condition groups
  2. Example: OR group containing two AND groups
  3. Show indentation and group operator dropdowns
  4. Screenshot: Condition group hierarchy
- **Size:** ~500px wide
- **Used in:** README.md, FEATURES.md

#### 07-server-side-settings.png

- **What to show:** Server-side configuration panel
- **Steps:**
  1. In panel settings, scroll to "Server-Side" section
  2. Toggle "Enable Server-Side Mode" ON
  3. Show query format dropdown and variable name inputs
  4. Screenshot: Full Server-Side section
- **Size:** ~400px wide
- **Used in:** README.md, SERVER_SIDE_SETUP.md

#### 08-threshold-rule.png

- **What to show:** Threshold rule editor
- **Steps:**
  1. Add new Highlight Rule
  2. Select "Threshold Rule" type
  3. Configure 2-3 thresholds with different colors
  4. Screenshot: Threshold configuration UI
- **Size:** ~500px wide
- **Used in:** FEATURES.md

#### 09-value-mapping-rule.png

- **What to show:** Value mapping editor
- **Steps:**
  1. Add new Highlight Rule
  2. Select "Value Mapping" type
  3. Add 3-4 value mappings (e.g., "Active" → Green, "Pending" → Yellow)
  4. Screenshot: Value mapping configuration
- **Size:** ~500px wide
- **Used in:** FEATURES.md

#### 10-data-range-gradient.png

- **What to show:** Gradient rule editor with color scheme
- **Steps:**
  1. Add new Highlight Rule
  2. Select "Data Range Gradient" type
  3. Open the color scheme selector showing gradient preview
  4. Screenshot: Gradient configuration with color scheme menu
- **Size:** ~500px wide
- **Used in:** FEATURES.md

#### 11-sparkchart-config.png

- **What to show:** SparkChart rule configuration
- **Steps:**
  1. Add new Highlight Rule
  2. Select "SparkChart" type
  3. Configure chart type, color, height
  4. Screenshot: SparkChart settings
- **Size:** ~500px wide
- **Used in:** FEATURES.md

#### 12-flags-column.png

- **What to show:** Flags column with icons
- **Steps:**
  1. Create a Flags Column rule
  2. Configure multiple flag conditions with different icons
  3. Apply to a column with sample data
  4. Screenshot: Grid showing the flags column with various icons
- **Size:** ~400px wide
- **Used in:** FEATURES.md

#### 13-colored-cells.png

- **What to show:** Grid with various cell highlighting
- **Steps:**
  1. Configure 3-4 different highlight rules (threshold, value mapping, gradient)
  2. Apply to different columns
  3. Ensure sample data triggers different highlights
  4. Screenshot: Grid showing colorful cells with different highlight styles
- **Size:** ~800px wide
- **Used in:** README.md

### Screenshot Tips

1. **Use consistent Grafana theme** (Dark mode recommended)
2. **Browser:** Chrome/Edge at 100% zoom
3. **Window size:** 1920x1080 or similar
4. **Tools:** Use browser screenshot tool or Snipping Tool
5. **Crop:** Remove unnecessary whitespace
6. **Optimize:** Use PNG compression (e.g., TinyPNG)
7. **Naming:** Exactly as listed above (01-panel-overview.png, etc.)

### Quick Screenshot Workflow

1. Configure panel once with all features
2. Take all screenshots in one session for consistency
3. Use a screenshot tool with numbering (e.g., Greenshot, ShareX)
4. Save to `docs/screenshots/` directory
5. Verify in README.md that images display correctly

## Image Specifications

- **Format:** PNG (preferred) or JPG
- **Max Width:** 1200px (for README)
- **Max Width:** 800px (for documentation pages)
- **Compression:** Optimize before committing
- **Naming:** Use descriptive kebab-case names with numbers for ordering
- **Alt Text:** Always provide in markdown
