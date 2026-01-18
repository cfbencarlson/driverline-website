# DriverLine Website

A professional, conversion-focused website for DriverLine - an outsourced delivery driver solutions company serving automotive parts stores and dealerships.

## Quick Start

### Local Development

1. **Open directly in browser:**
   Simply open `index.html` in your web browser.

2. **Using a local server (recommended):**

   Using Python:
   ```bash
   cd driverline-website
   python -m http.server 8000
   ```
   Then open http://localhost:8000

   Using Node.js (with npx):
   ```bash
   cd driverline-website
   npx serve .
   ```

   Using VS Code Live Server:
   - Install the "Live Server" extension
   - Right-click on `index.html` and select "Open with Live Server"

## Project Structure

```
driverline-website/
├── index.html          # Home page
├── about.html          # About page
├── contact.html        # Contact page with form
├── css/
│   └── styles.css      # Main stylesheet with design system
├── js/
│   └── main.js         # JavaScript for interactions and form validation
├── images/             # Image assets (add your images here)
└── README.md           # This file
```

## Pages

### Home (index.html)
- Hero section with primary CTA
- Problems we solve
- Our solution
- How it works (4 steps)
- Reliability & compliance trust section
- Who we serve
- Final CTA band

### About (about.html)
- Company overview
- Mission statement
- Our approach/values
- Services overview
- Insurance & risk section

### Contact (contact.html)
- Contact form with validation
- Contact information
- FAQ section

## Features

- **Mobile-first responsive design** - Works on all screen sizes
- **Accessible** - Proper ARIA labels, keyboard navigation, focus states
- **SEO-ready** - Semantic HTML, meta tags, proper heading hierarchy
- **Form validation** - Client-side validation with helpful error messages
- **Smooth interactions** - Scroll animations, mobile menu, header effects
- **Analytics-ready** - Placeholder hooks for Google Analytics/GTM

## Customization

### Colors

Edit CSS custom properties in `css/styles.css`:

```css
:root {
  --color-primary: #1a2b4a;        /* Dark blue - main brand color */
  --color-accent: #2563eb;          /* Blue - buttons, links */
  --color-text-primary: #1f2937;    /* Dark gray - main text */
  --color-bg-primary: #ffffff;      /* White - main background */
  /* ... */
}
```

### Typography

The site uses Inter font from Google Fonts. To change:

1. Update the Google Fonts link in each HTML file's `<head>`
2. Update the `--font-sans` variable in `css/styles.css`

### Contact Form

The form currently simulates submission. To connect to a real backend:

1. Open `js/main.js`
2. Find the `initContactForm` function
3. Replace the simulated delay with actual API call:

```javascript
const response = await fetch('/api/contact', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});

if (!response.ok) throw new Error('Submission failed');
```

### Analytics

Add your tracking code to the `<script>` tag in each HTML file's `<head>`:

```html
<!-- Google Tag Manager / Analytics -->
<script>
  window.dataLayer = window.dataLayer || [];
  // Add your GTM or GA4 code here
</script>
```

## Deployment Options

### Static Hosting (Recommended)

This is a static site and can be hosted anywhere:

- **Netlify**: Drag and drop the folder, or connect to Git
- **Vercel**: Import from Git or drag and drop
- **GitHub Pages**: Push to a repo and enable Pages
- **AWS S3 + CloudFront**: Upload files to S3 bucket
- **Cloudflare Pages**: Connect to Git repository

### Basic Deployment Steps

1. **Netlify (easiest):**
   - Go to https://app.netlify.com/drop
   - Drag the `driverline-website` folder
   - Your site is live!

2. **GitHub Pages:**
   ```bash
   # Initialize git repo
   git init
   git add .
   git commit -m "Initial commit"

   # Push to GitHub
   git remote add origin your-repo-url
   git push -u origin main

   # Enable Pages in repo Settings > Pages
   ```

3. **Custom domain:**
   - Add your domain to your hosting provider
   - Update DNS records as instructed
   - Update meta tags and canonical URLs

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS 14+)
- Chrome for Android (latest)

## Performance

The site is optimized for fast loading:

- Minimal external dependencies (only Google Fonts)
- CSS and JS are lean and focused
- No heavy frameworks or libraries
- Images should be optimized before adding

To further optimize:

1. Compress images (use WebP format)
2. Minify CSS and JS for production
3. Enable gzip compression on your server
4. Use a CDN for static assets

## Adding Images

Place images in the `images/` folder and reference them in HTML:

```html
<img src="images/your-image.jpg" alt="Description of image" loading="lazy">
```

Recommended image formats:
- **Photos**: WebP with JPEG fallback
- **Icons/logos**: SVG (already inline in the code)
- **Optimize**: Use tools like ImageOptim, Squoosh, or TinyPNG

## License

This website was built for DriverLine. All rights reserved.
