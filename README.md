# chiantera.github.io

A personal landing page that lists selected projects. It's live at https://chiantera.github.io/.

Plain HTML, CSS and JavaScript, with no build step. GitHub Pages serves the files as they are.

| File | Purpose |
| --- | --- |
| `index.html` | Page shell: header, language toggle, sections |
| `projects.json` | The curated list of projects shown on the page |
| `app.js` | Renders the cards, handles EN/IT and tag filters, fetches live GitHub stats |
| `styles.css` | Styles, including dark mode |

## Adding or editing a project

Add an entry to `projects.json`. The array order is the display order.

```json
{
  "repo": "my-repo",
  "title": { "en": "My Project", "it": "Il mio progetto" },
  "description": { "en": "One or two sentences.", "it": "Una o due frasi." },
  "tags": ["science"],
  "demo": "https://chiantera.github.io/my-repo/",
  "featured": false
}
```

- `repo` must be a **public** repo under `chiantera`. It's used for the Code link and to match live stats.
- `tags` should come from `science`, `apps`, `ai` or `creative`. Their labels are defined in `STRINGS` in `app.js`.
- `demo` is optional. Leave it out when there is no live version.
- `featured: true` puts the card in the top section.

Stars, main language and last-updated date come from the GitHub API in the visitor's browser. They're cached for an hour. If the API can't be reached, the cards still show without them.

## Local preview

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

`projects.json` is loaded with `fetch`, so opening `index.html` directly from disk won't work.
