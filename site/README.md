# Site

Public-facing site for FocusBadge. It communicates the product story, hosts badge pages at `focusbadge.com/{badgeId}`, and may expose lightweight onboarding content that links to the extension stores.

## Responsibilities

- Marketing landing page describing the accountability model and trust promises.
- Static assets under `public/` that can be deployed to any CDN.
- A lightweight Node dev server (`npm run dev`) for iterating locally on the HTML/CSS.
- Optional dashboards or widgets for embedding badges elsewhere.

## Development

```bash
cd site
npm install    # currently zero deps, but keeps the workflow consistent
npm run dev    # serves public/ at http://localhost:4173
npm run build  # copies public/ into dist/ for deployment
```

## TODO

- [ ] Decide on the long-term site stack (static builder vs. SSR vs. backend-rendered templates).
- [ ] Define badge page data contract and styling guidelines.
- [ ] Plan deployment + routing coordination with the backend’s badge API.
