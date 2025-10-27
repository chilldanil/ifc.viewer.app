# Quick Start Guide

## Running Both Applications

To run the IFC Viewer with the introduction page, you need to start both servers:

### Option 1: Run Both Manually (Recommended)

**Terminal 1 - Main Viewer (Port 3000):**
```bash
npm run dev
```

**Terminal 2 - Introduction Page (Port 4000):**
```bash
cd intro
npm start
```

### Option 2: Run from Root Directory

**Terminal 1:**
```bash
npm run dev
```

**Terminal 2:**
```bash
npm run intro
```

## Access the Applications

- **Introduction Page**: http://localhost:4000 (main entry point)
- **Main IFC Viewer**: http://localhost:3000 (embedded in introduction page)

## First Time Setup

If this is your first time running the introduction page, make sure http-server is available. It will be automatically installed when you run `npm start`.

## Notes

- The introduction page embeds the main viewer in an iframe
- Both servers need to be running simultaneously
- The main viewer must be on port 3000 for the embedding to work properly
- You can customize the introduction content in `intro/index.html`
- You can modify the styling in `intro/styles.css`

