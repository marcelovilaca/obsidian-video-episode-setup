# New Video Project Launcher

New Video Project Launcher is an Obsidian plugin that helps you create structured YouTube production folders with one click.
It is designed for creators who want a repeatable setup for:

- new video projects
- livestream projects
- guest episode projects

The plugin copies from your existing template folder, creates the new project in the right place, and opens the relevant notes so you can start working immediately.

![Small demo of the plugin in action](assets/obsidian-video-episode-setup.gif)

## What this plugin does

When you launch the command, the plugin can:

- create a new project folder from a reusable template
- name the project using your chosen format
- organize the project under your configured video projects root
- open the hub or project notes after creation
- support different project types such as video, livestream, and guest episode
- use your guest database and guest template for guest-based projects
- copy or prepare guest facial reference images when available

## Main commands

The plugin adds these commands to Obsidian’s command palette:

- Create New Video Project
- Create New Livestream Project
- Create New Guest Episode Project

You can also access the plugin from the settings area to adjust the template and folder paths.

## How to install

If you already have the plugin folder inside your Obsidian vault, you can install it manually by keeping it here:

`.obsidian/plugins/new-video-project-launcher`

For a manual install, the folder should contain at least:

- `main.js`
- `manifest.json`
- `README.md`
- `assets/obsidian-video-episode-setup.gif`

After that:

1. Open Obsidian
2. Go to Settings → Community plugins
3. Enable New Video Project Launcher
4. Open the command palette and run one of the plugin commands

## How to use it day to day

A simple daily workflow looks like this:

1. Open Obsidian
2. Decide what you are creating:
   - a standard video
   - a livestream
   - a guest episode
3. Run the matching command from the command palette
4. Fill in the launch form details
5. Let the plugin create the project folder
6. Open the generated hub and start filling in:
   - idea
   - research
   - script
   - packaging
   - QA
   - repurposing
   - analytics

For guest episodes, keep your guest database updated so the plugin can reuse existing guest information instead of making you retype everything.

## Configuration

The plugin is built around a few main settings:

- Template folder
- Projects root
- Guest database note
- Guest template path
- Open project folder in explorer

The default paths in the code are based on this structure:

- `Projects/Video Projects/_TEMPLATE - New Video Project`
- `Projects/Video Projects`
- `Notes/Podcast Guest Database.md`
- `Templates/Podcast Guest Template.md`

If your vault uses different folders, update the settings inside Obsidian to match your own structure.

## Recommended workflow

For best results, keep one clean template project with the notes and folders you want cloned every time.
A good template usually includes:

- a project hub note
- idea or outline note
- research note
- script note
- checklist or QA note
- thumbnail / packaging note
- repurposing note
- analytics note
- archive note

That way every new video starts from a predictable production system instead of a blank page.

## Files in this repository

- `main.js` — plugin logic
- `manifest.json` — plugin metadata
- `README.md` — project documentation
- `assets/obsidian-video-episode-setup.gif` — demo clip

## Notes

This repository contains the plugin source only.
It is meant to stay lightweight and easy to maintain.

## License

See `LICENSE` for the repository license.
