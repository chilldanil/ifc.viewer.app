# IFC Viewer - Introduction Page

This is the introduction page for the IFC Viewer project. It provides information about the project and embeds the main viewer application.

## Getting Started

### Prerequisites

Make sure you have Node.js installed on your system.

### Running the Introduction Page

1. **Start the main IFC Viewer application** (in the parent directory):
   ```bash
   cd ..
   npm run dev
   ```
   This will start the main viewer on port 3000.

2. **Start the introduction page** (in this directory):
   ```bash
   npm start
   ```
   This will start the introduction page on port 4000 and automatically open it in your browser.

The introduction page will be accessible at: `http://localhost:4000`

The embedded viewer will connect to the main application running on port 3000.

## Features

- Welcome message and project description
- Information about the team
- Key features overview
- Embedded IFC viewer iframe
- Responsive design
- Modern UI with smooth scrolling

## Structure

- `index.html` - Main HTML file with the introduction content
- `styles.css` - Styling for the introduction page
- `package.json` - Configuration for running the intro page server
- `README.md` - This file

## Customization

Feel free to customize:
- The welcome message and descriptions in `index.html`
- The styling and colors in `styles.css`
- Add your team members' information
- Include your project logo or images

