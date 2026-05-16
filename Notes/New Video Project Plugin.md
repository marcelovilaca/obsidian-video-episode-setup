---
tags:
  - creator-os
  - plugin
  - automation
---

# New Video Project Plugin

This note documents the local Obsidian plugin that adds the one-click project launcher.

## What it does
- Adds ribbon buttons inside Obsidian for video, livestream, and guest episode launches
- Adds command palette commands for video, livestream, and guest projects
- Prompts for a project type, theme, guest, and date
- If Guest = new, it prompts for Name, Country, Profession, Language, and Guest Image
- It adds the new guest to the guest database and category note
- It also stores the guest image if one is dropped into Attachments/Facial References
- Creates the full project folder automatically
- Seeds `01 - Idea & Brief.md` with starter prompts
- Generates `09 - AI Generation Prompt.md` for future reference
- Copies the AI prompt to the clipboard when possible
- Opens the system file explorer on the new folder
- Opens `00 - Project Hub.md` after creation

## Install location
- `.obsidian/plugins/new-video-project-launcher/`

## Files
- `manifest.json`
- `main.js`

## How to use
1. Enable the plugin in Obsidian settings.
2. Choose the ribbon button or command that matches the project type you want.
3. Fill in the theme, guest choice, and date.
4. Create the project.
5. Paste the copied AI prompt into Hermes, Codex, OpenCode, or another agent if you want the rest generated automatically.

## Safety note
This plugin has local filesystem access because that is how it creates folders.
Only keep it installed if you trust the code in the vault.

## Related notes
- [[New Video Project Control Center]]
- [[New Video Project Click Launcher]]
- [[New Video Project Launcher]]
- [[Video Project Folder Blueprint]]
- [[Start Here]]
