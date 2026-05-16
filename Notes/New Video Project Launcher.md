---
tags:
  - creator-os
  - launcher
  - automation
---

# New Video Project Launcher

This note is the fastest way to start a new video or livestream project.

## What it does
- Creates a full project folder from the template
- Copies all project notes inside
- Uses the theme, guest choice, and date to seed the notes
- Generates the AI prompt note for future reference
- Gives you a clean starting point for the new piece

## Best method
If the Obsidian plugin is enabled, use the ribbon button or command palette.
If you want a transparent manual route, run the automation script:

`References/Automation/create_video_project.py`

Vault backup of the Windows launcher:

`References/Automation/NewVideoProjectLauncher.bat`

## Example usage

```bash
python "References/Automation/create_video_project.py" "Iran and the New Global Trade War"
python "References/Automation/create_video_project.py" "Live: Ukraine Update and Q&A" --type youtube-livestream
python "References/Automation/create_video_project.py" "BRICS and the Dollar" --date 2026-05-04
```

## Folder created
The script creates a folder like this:

`Projects/Video Projects/2026/2026-05-04 - iran-and-the-new-global-trade-war/`

Inside it you get:
- 00 - Project Hub.md
- 01 - Idea & Brief.md
- 02 - Research Dossier.md
- 03 - Script.md
- 04 - Packaging.md
- 05 - Launch QA.md
- 06 - Repurposing.md
- 07 - Analytics.md
- 08 - Archive.md
- 09 - AI Generation Prompt.md
- Assets/
- Sources/
- Exports/
- Clips/
- Notes/

## Daily use
1. Open this note.
2. Or open [[Scripts Index]] if you want the quick file list first.
3. Run the script with the new title.
4. Open the new folder.
5. Fill the project hub.
6. Work stage by stage.

## If you want true one-click inside Obsidian
That usually needs a community plugin like a shell-command runner or templater-style launcher.
If you want, I can prepare that next too.
