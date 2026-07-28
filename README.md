# dtcg-editor
An open source DTCG token editor

## Getting Started
Before starting the web app, scaffold `dtcg-editor.config.json` (it points the app at your DTCG token files):

```
pnpm --filter web-app run init-config
```

Run with no flags for an interactive prompt, or pass `--tokens-dir <path>` for a non-interactive/scripted setup (`--force` to overwrite an existing config, `--help` for full usage).
