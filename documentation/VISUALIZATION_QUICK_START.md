# Quick Start Guide - Test Visualization Feature Locally

## Prerequisites
- Python environment activated
- Node.js installed
- PostgreSQL database with test data (already done ✅)

## Step 1: Start Backend

```bash
cd api
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Wait for: "Application startup complete"

## Step 2: Start Frontend (New Terminal)

```bash
cd frontend
npm run dev
```

Wait for: "Local: http://localhost:5173"

## Step 3: Test the Feature

1. Open browser: http://localhost:5173
2. Login to your account
3. Navigate to "Database Chat" page
4. Connect to database:
   ```
   postgresql://postgres:abhi8147893200@db.pasrgxwulnyciipwscgq.supabase.co:5432/postgres
   ```
5. After connection success, click the **"📊 Visualize"** button
6. You should see:
   - Overview tab with auto-generated charts
   - Custom tab with visualization builder
   - Schema tab with table metadata

## Expected Results

### Overview Tab
- Bar chart: "Database Overview: Row Counts by Table"
- Bar charts for numeric column statistics (Min/Max/Avg)
- Pie chart: "Data Distribution Across Tables"

### Custom Tab
- Builder form on left
- Generated charts on right
- Try: Select "orders" table → "status" dimension → "total_amount" metric → "sum" aggregation

### Schema Tab
- List of all tables with row counts
- Column details (name, type, category, nullable, keys)

## Troubleshooting

### Backend Issues
- Check terminal for errors
- Verify imports: `python test_visualization_setup.py`
- Check http://localhost:8000/docs for API documentation

### Frontend Issues
- Check browser console for errors
- Verify API URL in `frontend/src/services/api.js`
- Check network tab for failed requests

### Database Connection Issues
- Use connection pooler URL (port 6543) instead of direct (port 5432)
- Check SUPABASE_CONNECTION_FIX.md for details

## Deploy to Render

Once everything works locally:

```bash
git add .
git commit -m "Add database visualization feature"
git push origin main
```

Monitor deployment at: https://dashboard.render.com

## API Endpoints Reference

- **POST** `/api/visualization/metadata` - Get database overview
- **POST** `/api/visualization/custom` - Generate custom chart
- **GET** `/api/visualization/health` - Health check

Test endpoints: http://localhost:8000/docs
