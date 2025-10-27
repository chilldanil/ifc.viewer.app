# Introduction Page - Setup Guide

## 📋 Overview

This introduction page serves as a landing page for your IFC Viewer project. It provides:
- A professional welcome message
- Project description and features overview
- Information about your team
- An embedded live demo of the IFC Viewer

## 🚀 Quick Start

### Step 1: Start the Main Viewer
```bash
# From the project root directory
npm run dev
```
This starts the main IFC Viewer application on **port 3000**.

### Step 2: Start the Introduction Page
```bash
# Option A: From the project root
npm run intro

# Option B: From the intro directory
cd intro
npm start
```
This starts the introduction page on **port 4000**.

### Step 3: Access the Introduction Page
Open your browser and navigate to:
```
http://localhost:4000
```

## 🪟 Windows Users - One-Click Start

For convenience, we've included a batch script that starts both servers automatically:

1. Double-click `start-both.bat` in the project root, OR
2. Run from command prompt:
   ```bash
   start-both.bat
   ```

This will open two separate command windows:
- One for the main viewer (port 3000)
- One for the introduction page (port 4000)

## 📁 File Structure

```
intro/
├── index.html          # Main HTML file with welcome content
├── styles.css          # Styling for the introduction page
├── package.json        # Configuration for running the server
├── README.md           # Detailed documentation
├── QUICKSTART.md       # Quick reference guide
└── SETUP-GUIDE.md      # This file
```

## ✏️ Customization

### Updating the Welcome Message
Edit `intro/index.html` and modify the content within:
- `<h1>` tag for the main title
- `.intro-text` section for project description
- `.features` section for features list
- "About Us" section to add your team information

### Changing the Styling
Edit `intro/styles.css` to customize:
- Color scheme (search for `#667eea` and `#764ba2` to change the gradient)
- Fonts and typography
- Layout and spacing
- Responsive breakpoints

### Modifying the Embedded Viewer
The viewer is embedded using an iframe. You can:
1. Change the iframe source URL in `index.html` (line with `src="http://localhost:3000"`)
2. Adjust the height by modifying the `height` property in `styles.css`
3. Add additional parameters or features around the iframe

## 🔧 Technical Details

### Server Technology
The introduction page uses `http-server`, a simple, zero-configuration HTTP server:
- No build process required
- Serves static HTML/CSS files
- CORS enabled for embedding
- Automatic browser opening

### Port Configuration
- **Main Viewer**: Port 3000 (defined in main `vite.config.ts`)
- **Introduction Page**: Port 4000 (defined in `intro/package.json`)

To change the introduction page port, edit `intro/package.json`:
```json
"scripts": {
  "start": "npx http-server . -p YOUR_PORT -o --cors"
}
```

## 🐛 Troubleshooting

### Problem: Introduction page shows empty iframe
**Solution**: Make sure the main viewer is running on port 3000
```bash
npm run dev
```

### Problem: Port 4000 is already in use
**Solution**: Either:
1. Stop the other application using port 4000, or
2. Change the port in `intro/package.json`

### Problem: "Cannot GET /" error
**Solution**: Make sure you're running the server from the correct directory:
```bash
cd intro
npm start
```

### Problem: CORS errors in browser console
**Solution**: The `--cors` flag should be included in the package.json script. Verify it's present.

## 📝 Notes

- Both servers need to run simultaneously for the embedded viewer to work
- The introduction page is completely independent of the main app
- You can customize the content without affecting the main viewer
- The page is responsive and works on mobile devices

## 🎨 Branding Tips

To match your organization's branding:
1. Replace color values in `styles.css`
2. Add your logo by including an `<img>` tag in `index.html`
3. Update the team information in the "About Us" section
4. Add social media links in the footer
5. Include screenshots or demo videos

## 📚 Additional Resources

- Main project documentation: `../README.md`
- Quick start guide: `QUICKSTART.md`
- Introduction page details: `README.md`

## 💡 Tips

1. **Development**: Keep both terminals open side-by-side for easy monitoring
2. **Testing**: Test the introduction page on different browsers and screen sizes
3. **Content**: Keep the introduction concise and engaging
4. **Images**: Add screenshots of your viewer in action
5. **Links**: Update GitHub links to point to your repository

## 🤝 Getting Help

If you encounter issues:
1. Check that both servers are running
2. Verify the ports are correct
3. Look for errors in the browser console
4. Review the troubleshooting section above
5. Check the main project documentation

---

**Happy viewing! 🏗️**

