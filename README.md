# Pla-téo Website

Redesigned one-page website for [plateo.co.za](https://www.plateo.co.za) — Authentic Spanish Street Food, Gauteng, South Africa.

## Stack
- Vanilla HTML5 / CSS3 / JavaScript (no frameworks, no dependencies)
- Served locally with `npx serve`

## Local Development
```bash
npx serve -p 5173 .
# Open http://localhost:5173
```

## Structure
```
├── index.html          # Full one-pager
├── style.css           # Design system + all component styles
├── main.js             # Scroll reveal, parallax, hardened form validation
└── assets/
    ├── logo.webp       # Pla-téo brand logo
    ├── real_paella.jpg # Hero + food card — actual Pla-téo paella
    ├── sarita_team.jpg # About section — Sarita & team at the food truck
    ├── churros.png     # Food card
    └── event_cooking.png # On-site experience card
```

## Security
- Content Security Policy (CSP) meta tag
- X-Frame-Options DENY (clickjacking protection)
- X-Content-Type-Options nosniff
- Referrer-Policy no-referrer
- Permissions-Policy (camera, mic, geolocation, payment disabled)
- Honeypot anti-bot field on contact form
- Client-side rate limiting (3 submissions per 10-minute window)
- All form inputs sanitised before mailto body construction
- XSS-safe output via `encodeURIComponent`
- Input `maxlength` constraints on every field
- Strict field validation with per-field error messages

## Sections
1. Fixed glass-morphism navbar
2. Full-viewport parallax hero
3. About — story + stacked image cards
4. Our Food — Paella, On-Site Experience, Churros
5. Locations — Private Catering + Food Truck @ Salvador Deli
6. Book an Event — detailed booking form
7. Our Team — masonry gallery
8. Footer

## Deployment
Static site — drag the folder to [Netlify Drop](https://app.netlify.com/drop) or any static host.
