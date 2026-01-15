# Enhanced Grid Panel - Feature Guide

Complete guide to all features of the Enhanced Grid Panel for Grafana.

## Table of Contents

- [Column Filtering](#column-filtering)
- [Pagination](#pagination)
- [Cell Highlighting & Formatting](#cell-highlighting--formatting)
- [Server-Side Operations](#server-side-operations)
- [Advanced Features](#advanced-features)

---

## Column Filtering

The Enhanced Grid panel includes powerful column filtering with smart type detection.

### Features

- ✨ **Smart Type Detection**: Automatically detects column types (text, number, date, boolean)
- 🎯 **Operator-Based Filtering**: Different operators based on column type
- 🚀 **Server-Side Support**: Works with both client-side and server-side filtering
- 🎨 **Clean UI**: Filter dropdown with operator selection and value inputs

### How to Use

1. Click the **Filter** button below any column header
2. Select an operator from the dropdown
3. Enter a value (if required)
4. Click **Apply**

The filter button will highlight in blue when a filter is active.

### Available Operators by Column Type

#### Numeric Columns

- Equals (=)
- Not Equals (≠)
- Greater Than (>)
- Less Than (<)
- Greater or Equal (≥)
- Less or Equal (≤)
- Between
- Is Blank
- Is Not Blank

#### Text Columns

- Contains
- Equals
- Starts With
- Ends With
- Is Blank
- Is Not Blank

#### Date Columns

- Before
- After
- Between
- Is Blank
- Is Not Blank

#### Boolean Columns

- Is True
- Is False
- Is Blank

### Filter Examples

**Text - Contains:** Find rows where column contains "laptop"

```
Operator: Contains
Value: laptop
Result: Matches "Dell Laptop", "Gaming Laptop Pro", etc.
```

**Number - Between:** Find values between 100 and 500

```
Operator: Between
Value 1: 100
Value 2: 500
Result: Matches any number from 100 to 500 inclusive
```

**Date - After:** Find dates after January 1, 2024

```
Operator: After
Value: 2024-01-01
Result: Matches all dates from Jan 1, 2024 onwards
```

### Clearing Filters

- Click the filter button again and select **Clear Filter**
- Or click **Clear All Filters** button (if available)

---

## Pagination

Control how data is displayed across pages for better performance and usability.

### Pagination Modes

#### Client-Side Pagination

**How It Works:**

1. All data fetched from datasource once
2. Filtering and sorting applied in browser
3. Results paginated in browser
4. Fast page navigation (no network requests)

**Best For:**

- Datasets under 10,000 rows
- When you need instant page switching
- When server doesn't support pagination

**Configuration:**

```
Pagination Settings:
├─ Pagination Enabled: ✓
├─ Page Size: 50
└─ Server-Side Pagination: ✗
```

#### Server-Side Pagination

**How It Works:**

1. Only current page data fetched from datasource
2. Page navigation triggers new queries
3. Total count retrieved separately (if supported)
4. Minimal memory usage

**Best For:**

- Datasets over 10,000 rows
- OData or SQL datasources
- When network bandwidth is limited

**Configuration:**

```
Pagination Settings:
├─ Pagination Enabled: ✓
├─ Page Size: 50
├─ Server-Side Mode: ✓
└─ Server-Side Pagination: ✓

Server-Side Settings:
├─ Skip Variable: gridSkip
└─ Top Variable: gridTop
```

### Setting Up Pagination

#### Enable Basic Pagination

1. Edit panel
2. Scroll to **Pagination** section
3. Toggle **Pagination Enabled** ON
4. Set **Page Size** (default: 50)
5. Save

#### Enable Server-Side Pagination

1. Follow client-side setup above
2. Create dashboard variables:
   - `gridSkip` (Text box, hidden)
   - `gridTop` (Text box, hidden)
3. Enable **Server-Side Mode**
4. Enable **Server-Side Pagination**
5. Set skip/top variable names
6. Update datasource query to use variables

**OData Example:**

```
https://api.example.com/data?$skip=${gridSkip}&$top=${gridTop}
```

**SQL Example:**

```sql
SELECT * FROM table
LIMIT ${gridTop} OFFSET ${gridSkip}
```

### Pagination Controls

- **Page Numbers**: Click page number to jump to that page
- **Next/Previous**: Navigate one page at a time
- **First/Last**: Jump to first or last page
- **Page Size Selector**: Change rows per page (if enabled)

---

## Cell Highlighting & Formatting

Apply colors, backgrounds, and styles to cells based on data values.

### Rule Types

#### 1. Threshold Rules

Color cells based on numeric value ranges.

**Example: Color sales performance**

```
Rule: Sales Performance
├─ Apply To: sales_amount
├─ Thresholds:
│  ├─ < 1000: Red background
│  ├─ 1000-5000: Yellow background
│  └─ > 5000: Green background
```

**Configuration:**

1. Add Rule → Select **Threshold Rule**
2. Set rule name
3. Select columns to apply to
4. Add threshold values and colors
5. Save

#### 2. Value Mapping

Map specific values to colors and icons.

**Example: Status indicators**

```
Rule: Order Status
├─ Apply To: status
├─ Mappings:
│  ├─ "pending" → Orange + ⏳ icon
│  ├─ "shipped" → Blue + 🚚 icon
│  └─ "delivered" → Green + ✅ icon
```

**Configuration:**

1. Add Rule → Select **Value Mapping**
2. Set rule name
3. Select column
4. Add value mappings with colors/icons
5. Save

#### 3. Data Range Gradient

Apply smooth color gradients across value ranges.

**Example: Heat map effect**

```
Rule: Temperature Range
├─ Apply To: temperature
├─ Min Value: 0 (Blue)
├─ Mid Value: 50 (Yellow)
└─ Max Value: 100 (Red)
```

**Configuration:**

1. Add Rule → Select **Data Range Gradient**
2. Set min/mid/max values
3. Choose color scheme
4. Save

#### 4. Flags Column

Display icon flags based on multiple conditions.

**Example: Alert indicators**

```
Rule: Alert Flags
├─ Apply To: alerts
├─ Flags:
│  ├─ high_priority → 🔴
│  ├─ overdue → ⚠️
│  └─ critical → 🚨
```

#### 5. SparkChart

Embed mini line/bar charts in cells.

**Example: Trend visualization**

```
Rule: 7-Day Trend
├─ Apply To: trend_data
├─ Chart Type: Line
├─ Color: Blue
└─ Height: 30px
```

### Nested Condition Groups

Build complex logical expressions for precise highlighting.

**Simple AND Group:**

```
Group (AND)
├─ Condition: status == "active"
└─ Condition: value > 100

Evaluates: status == "active" AND value > 100
```

**Mixed Logic:**

```
Group (OR)
├─ Group (AND)
│  ├─ Condition: status == "active"
│  └─ Condition: value > 100
└─ Condition: priority == "high"

Evaluates: (status == "active" AND value > 100) OR priority == "high"
```

**Complex Nested:**

```
Group (OR)
├─ Group (AND)
│  ├─ Condition: region == "US"
│  └─ Condition: sales > 1000
├─ Group (AND)
│  ├─ Condition: region == "EU"
│  └─ Condition: sales > 800
└─ Condition: vip == true

Evaluates: (region == "US" AND sales > 1000) OR
           (region == "EU" AND sales > 800) OR
           vip == true
```

### Creating Nested Conditions

1. In rule editor, click **Add Group**
2. Set group operator (AND/OR)
3. Add conditions or nested groups
4. Use indentation to visualize hierarchy
5. Test rule against sample data

### Condition Operators

**Comparison:**

- `equals` / `not_equals`
- `greater_than` / `less_than`
- `greater_than_or_equal` / `less_than_or_equal`
- `contains` / `not_contains`
- `starts_with` / `ends_with`
- `is_null` / `is_not_null`

**Logical:**

- `AND`: All conditions must be true
- `OR`: At least one condition must be true

### Compare Types

- **Value**: Compare to a static value (string, number, boolean)
- **Field**: Compare to another field in the same row

**Example - Field Comparison:**

```
Condition: actual > budget
├─ Source Field: actual_sales
├─ Operator: greater_than
├─ Compare Type: Field
└─ Compare Field: budget_sales
```

---

## Server-Side Operations

Push filtering, sorting, and pagination to your datasource for better performance with large datasets.

### Supported Datasources

- **OData APIs** (via Infinity datasource)
- **PostgreSQL**
- **MySQL**
- **Microsoft SQL Server**
- **Any REST API** (with custom query format)

### Setup Guide

#### Step 1: Create Dashboard Variables

1. Go to Dashboard Settings → Variables
2. Create these variables:

**Filter Variable:**

```
Name: gridFilter
Type: Text box
Hide: Variable
```

**Sort Variable:**

```
Name: gridSort
Type: Text box
Hide: Variable
```

**Pagination Variables (if using server-side pagination):**

```
Name: gridSkip
Type: Text box
Hide: Variable

Name: gridTop
Type: Text box
Hide: Variable
```

#### Step 2: Configure Panel Settings

1. Edit panel → **Server-Side** section
2. Enable **Server-Side Mode**
3. Select **Query Format**:
   - **OData**: For OData APIs
   - **SQL**: For SQL databases
   - **JSON**: For custom APIs
4. Set variable names to match Step 1

#### Step 3: Update Datasource Query

**For OData (Infinity Datasource):**

```
URL: https://api.example.com/odata/Products?$filter=${gridFilter}&$orderby=${gridSort}&$skip=${gridSkip}&$top=${gridTop}
```

**For PostgreSQL/MySQL:**

```sql
SELECT * FROM products
WHERE ${gridFilter}
ORDER BY ${gridSort}
LIMIT ${gridTop} OFFSET ${gridSkip}
```

### Query Format Examples

#### OData Format

**Filter Output:**

```
status eq 'active' and price gt 100
```

**Sort Output:**

```
price desc, name asc
```

#### SQL Format

**Filter Output:**

```
status = 'active' AND price > 100
```

**Sort Output:**

```
price DESC, name ASC
```

#### JSON Format

**Filter Output:**

```json
{ "status": "active", "price": { "$gt": 100 } }
```

### Testing Server-Side Mode

1. Enable server-side mode
2. Open browser DevTools → Network tab
3. Apply a filter or sort in the panel
4. Check the network request to verify query parameters

---

## Advanced Features

### Debugging Cell Coloring

If cell coloring isn't working as expected:

1. Open browser console (F12)
2. Look for debug messages:
   - `[HighlightEngine]` - Rule evaluation
   - `[ConditionGroup]` - Condition results
3. Check:
   - Are rules applying to correct columns?
   - Are conditions evaluating correctly?
   - Are styles being generated?

### Performance Tips

**For Large Datasets:**

- Enable server-side mode
- Use server-side pagination
- Limit page size to 50-100 rows
- Minimize number of highlight rules

**For Complex Highlighting:**

- Combine related conditions into groups
- Use specific column targeting (avoid "All Columns")
- Test rules with sample data first
- Remove unused rules

### Keyboard Shortcuts

- **Arrow Keys**: Navigate cells (if enabled)
- **Page Up/Down**: Navigate pages
- **Home/End**: First/Last page

### Custom Styling

Use Grafana's theme system to customize panel appearance:

- Colors adapt to light/dark theme
- Use theme variables for consistency
- Override in panel CSS (advanced)

---

## Troubleshooting

### Filters Not Working

**Check:**

- Is column type detected correctly?
- Is server-side mode configured properly?
- Are dashboard variables created?
- Is datasource query using variables?

### Pagination Issues

**Check:**

- Is pagination enabled?
- Is page size set correctly?
- For server-side: Are skip/top variables configured?
- Does datasource support pagination?

### Highlighting Not Applied

**Check:**

- Does rule apply to the correct columns?
- Are conditions correct?
- Is data in expected format?
- Check browser console for errors

### Server-Side Not Updating

**Check:**

- Are dashboard variables created and hidden?
- Is query using variable syntax correctly (${varName})?
- Is server-side mode enabled?
- Are variable names matching?

---

## Migration Notes

### From Legacy Conditions

Old flat condition lists are automatically migrated to nested groups:

- All conditions wrapped in single AND group
- No manual changes needed
- Can enhance with nesting after migration

### Backward Compatibility

The panel maintains backward compatibility with:

- Old rule formats
- Legacy configuration options
- Previous Grafana versions (11.6.0+)
