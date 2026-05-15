# DriverLine Website

Public marketing site for **DriverLine** — dedicated managed delivery driver coverage for auto parts stores, dealerships, and related automotive aftermarket businesses.

- **Live site:** https://www.yourdriverline.com
- **Hosting:** GitHub Pages (custom domain set via `CNAME`)
- **Stack:** Static HTML / CSS / vanilla JS — no build step

This repo is the public marketing site only. It is separate from the DriverLine Operations Dashboard.

## Local development

Serve the folder over HTTP so relative paths and the manifest resolve correctly:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Any other static server (`npx serve .`, VS Code Live Server, etc.) works equivalently.

## Project layout

```
driverline-website/
├── index.html             # Home
├── about.html             # About
├── resources.html         # Cost estimator + resources
├── contact.html           # Lead form (Web3Forms)
├── privacy.html           # Privacy policy & SMS terms
├── terms.html             # Terms & conditions
├── robots.txt
├── sitemap.xml
├── site.webmanifest
├── CNAME                  # GitHub Pages custom domain
├── css/styles.css
├── js/
│   ├── main.js            # Nav, form validation, smooth scroll, calculator handoff
│   └── cost-calculator.js # Resources page cost estimator
└── images/
```

## Contact form

The contact form posts to **Web3Forms** (`https://api.web3forms.com/submit`). Configuration lives in hidden inputs inside `contact.html`:

- `access_key` — Web3Forms project key
- `subject`, `from_name`, `botcheck` — Web3Forms metadata / honeypot
- `calculatorMonthlyTotal`, `calculatorDrivers`, `calculatorVehicles` — values handed off from the resources cost estimator via the query string

Client-side validation lives in `js/main.js` (`initContactForm`).

## Cost estimator

`resources.html` + `js/cost-calculator.js` compute a monthly in-house delivery cost estimate from 15 inputs and render 7 result spans. The "Request Coverage" CTA on the estimator links to `contact.html?…#request-coverage`, and `js/main.js` (`initCalculatorParams`) hydrates the form's hidden calculator fields from those query params.

## Deployment

Pushing to `main` triggers the GitHub Pages build for `cfbencarlson/driverline-website`. The custom domain (`CNAME`) routes the site at https://www.yourdriverline.com. Updates typically appear within ~1–2 minutes of the build, then propagate after the Fastly + browser cache (max-age ~600s) clears. Hard refresh or load in Incognito for immediate verification.

No build, no preview environment, no separate staging. The deployed site is whatever is on `main`.

## Conventions

- Keep changes tightly scoped. Stage exact files; don't use `git add .` / `-A`.
- Don't break: the contact form (field IDs, Web3Forms hidden inputs, success/error states), the cost estimator (15 input IDs, 7 result spans, `#request-coverage-btn`, calculator handoff URL shape), or the mobile nav (64px header, `.mobile-nav { top: 64px }`).
- Do not touch the Operations Dashboard repo from here.
