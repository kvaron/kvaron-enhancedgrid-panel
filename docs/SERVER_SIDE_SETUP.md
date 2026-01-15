# Server-Side Filtering and Sorting Setup Guide

This guide explains how to configure server-side filtering and sorting with your datasource (Infinity, PostgreSQL, MySQL, etc.).

## Overview

When **Server-Side Mode** is enabled, the panel pushes filter and sort state to dashboard variables instead of filtering/sorting data locally. Your datasource queries can then use these variables to apply filters and sorting at the data source level.

## Benefits

- **Performance**: Handle large datasets by filtering at the source
- **Efficiency**: Reduce network payload by only fetching needed data
- **Scalability**: Works with any size dataset

## Setup Instructions

### Step 1: Create Dashboard Variables

1. Go to your Grafana dashboard settings (gear icon)
2. Navigate to **Variables**
3. Create two new variables:

   **Filter Variable:**
   - **Name**: `gridFilter` (or your custom name)
   - **Type**: Text box
   - **Hide**: Variable (optional - hides from dashboard UI)

   **Sort Variable:**
   - **Name**: `gridSort` (or your custom name)
   - **Type**: Text box
   - **Hide**: Variable (optional)

### Step 2: Configure Panel Settings

1. Edit your Enhanced Grid panel
2. Go to the **Server-Side** section in panel options
3. Enable **Server-Side Mode**
4. Select your **Query Format**:
   - **OData**: For OData APIs (produces `$filter` and `$orderby`)
   - **SQL**: For PostgreSQL, MySQL, etc. (produces `WHERE` and `ORDER BY` clauses)
   - **JSON**: Generic format for custom APIs
5. Set **Filter Variable Name**: `gridFilter` (must match your dashboard variable)
6. Set **Sort Variable Name**: `gridSort` (must match your dashboard variable)

### Step 3: Configure Your Datasource Query

#### For Infinity Datasource (OData API)

Configure your URL template to use the variables:

```
https://api.example.com/odata/Products?$filter=${gridFilter}&$orderby=${gridSort}
```

**Example with filters applied:**

- User filters: Name contains "laptop", Category contains "electronics"
- Generated URL: `https://api.example.com/odata/Products?$filter=contains(tolower(Name), 'laptop') and contains(tolower(Category), 'electronics')&$orderby=Price desc`

#### For PostgreSQL/MySQL Datasource

Use variables in your SQL query:

```sql
SELECT * FROM products
WHERE ${gridFilter:raw}
ORDER BY ${gridSort:raw}
```

**Important**: Use the `:raw` format specifier to prevent escaping.

**Example with filters applied:**

- User filters: name contains "laptop"
- User sorts by: price DESC
- Generated query:
  ```sql
  SELECT * FROM products
  WHERE name ILIKE '%laptop%'
  ORDER BY price DESC
  ```

#### For Infinity Datasource (Custom REST API)

If your API uses custom query parameters:

```
https://api.example.com/products?filter=${gridFilter}&sort=${gridSort}
```

With JSON format selected, the variables will contain JSON-encoded values.

### Step 4: Handle Empty Variables

Add default handling for when no filters/sorts are applied:

**PostgreSQL/MySQL:**

```sql
SELECT * FROM products
WHERE 1=1 ${gridFilter:raw}
ORDER BY ${gridSort:raw}
```

This ensures the query is valid even when variables are empty.

**OData:**

```
https://api.example.com/odata/Products?${gridFilter:queryparam}&${gridSort:queryparam}
```

## Query Format Examples

### OData Format

**Filter Output:**

```
contains(tolower(Name), 'laptop') and contains(tolower(Price), '999')
```

**Sort Output:**

```
Price desc
```

**Usage in URL:**

```
?$filter=contains(tolower(Name), 'laptop')&$orderby=Price desc
```

### SQL Format

**Filter Output (WHERE clause):**

```
Name ILIKE '%laptop%' AND Price ILIKE '%999%'
```

**Sort Output (ORDER BY clause):**

```
Price DESC
```

**Usage in Query:**

```sql
SELECT * FROM products
WHERE Name ILIKE '%laptop%' AND Price ILIKE '%999%'
ORDER BY Price DESC
```

### JSON Format

**Filter Output:**

```json
{ "Name": "laptop", "Price": "999" }
```

**Sort Output:**

```
-Price
```

(Minus sign indicates descending)

## Testing Your Setup

1. **Enable server-side mode** in panel settings
2. **Type in a column filter** (e.g., filter the "Name" column)
3. **Check the dashboard URL** - you should see `var-gridFilter=...` in the URL
4. **Click a column header** to sort
5. **Check the dashboard URL** - you should see `var-gridSort=...` in the URL
6. **Verify the datasource query** is receiving the correct parameters

## Troubleshooting

### Variables not updating

- Check that variable names match exactly (case-sensitive)
- Ensure variables are created at the dashboard level
- Verify "Server-Side Mode" is enabled

### Query not filtering/sorting

- Check datasource query syntax
- Use `:raw` format specifier in SQL queries
- Verify API endpoint supports the query format
- Check browser network tab to see actual request

### Empty results

- Ensure empty variable handling is in place
- Check if API requires specific parameter format
- Verify column names match exactly between panel and datasource

## Advanced: Custom Query Formats

If you need a custom format, you can modify the query builder in `src/utils/odataQueryBuilder.ts`. The `buildGenericQuery` function can be customized to match your API's requirements.

## Performance Tips

1. **Add indexes** to filtered/sorted columns in your database
2. **Limit result sets** using pagination or row limits
3. **Cache queries** at the API level when possible
4. **Use appropriate data types** for sorting (numeric vs text)

## Examples by Datasource

### Infinity Datasource (OData)

- Format: OData
- URL: `https://services.odata.org/V4/Northwind/Northwind.svc/Products?$filter=${gridFilter}&$orderby=${gridSort}`

### PostgreSQL

- Format: SQL
- Query:
  ```sql
  SELECT * FROM products
  WHERE 1=1 $__rawSql(${gridFilter:raw})
  ORDER BY $__rawSql(${gridSort:raw})
  ```

### Infinity Datasource (Custom API)

- Format: JSON
- URL: `https://api.example.com/data?filters=${gridFilter}&sort=${gridSort}`
