# Quick Start: Server-Side Filtering & Sorting

Get server-side filtering and sorting working in 5 minutes!

## Quick Setup (Infinity Datasource + OData)

### 1. Create Dashboard Variables

In your Grafana dashboard settings → Variables, create:

- **Variable 1:**
  - Name: `gridFilter`
  - Type: Text box
  - Hide: Variable ✓

- **Variable 2:**
  - Name: `gridSort`
  - Type: Text box
  - Hide: Variable ✓

### 2. Configure Your Infinity Datasource Query

In your query editor, set the URL to:

```
https://your-api.com/odata/YourEntity?$filter=${gridFilter}&$orderby=${gridSort}
```

### 3. Enable Server-Side Mode in Panel

In the Enhanced Grid panel settings:

1. Go to **Server-Side** section
2. Toggle **Enable Server-Side Mode** ON
3. Set **Query Format** to `OData ($filter, $orderby)`
4. Set **Filter Variable Name** to `gridFilter`
5. Set **Sort Variable Name** to `gridSort`

### 4. Test It!

- Type in any column filter box
- Click a column header to sort
- Watch the data refresh from your API!

---

## Quick Setup (PostgreSQL/MySQL)

### 1. Create Dashboard Variables

Same as above (create `gridFilter` and `gridSort` variables)

### 2. Configure Your SQL Query

```sql
SELECT * FROM your_table
WHERE 1=1 ${gridFilter:raw}
ORDER BY ${gridSort:raw}
```

**Important:** Use `:raw` to prevent variable escaping!

### 3. Enable Server-Side Mode in Panel

1. **Server-Side** section → Enable
2. **Query Format** → `SQL (WHERE, ORDER BY)`
3. **Filter Variable Name** → `gridFilter`
4. **Sort Variable Name** → `gridSort`

### 4. Test It!

Filter and sort - your database handles it all!

---

## What Happens Behind the Scenes

When you filter "Name" column with "laptop" and sort by "Price" descending:

**OData format generates:**
```
gridFilter = contains(tolower(Name), 'laptop')
gridSort = Price desc
```

**SQL format generates:**
```
gridFilter = Name ILIKE '%laptop%'
gridSort = Price DESC
```

**Your datasource receives:**
```
OData: ?$filter=contains(tolower(Name), 'laptop')&$orderby=Price desc
SQL:   WHERE Name ILIKE '%laptop%' ORDER BY Price DESC
```

---

## Common Issues

**Q: Variables not updating?**
A: Check variable names match exactly (case-sensitive)

**Q: Getting empty results?**
A: Make sure to handle empty variables:
- SQL: Use `WHERE 1=1 ${gridFilter:raw}` (the `1=1` ensures valid SQL when empty)
- OData: Variables will be empty strings when no filter/sort applied

**Q: Want to disable server-side temporarily?**
A: Just toggle "Enable Server-Side Mode" OFF - panel returns to client-side filtering

---

## Advanced: Multiple Grids on One Dashboard

Each grid can use different variables:

**Grid 1:**
- Filter Variable: `grid1Filter`
- Sort Variable: `grid1Sort`

**Grid 2:**
- Filter Variable: `grid2Filter`
- Sort Variable: `grid2Sort`

Create separate dashboard variables for each grid!

---

## Need Help?

See [SERVER_SIDE_SETUP.md](SERVER_SIDE_SETUP.md) for detailed examples and troubleshooting.
