---
tags:
  - creator-os
  - recovery
  - prompt
  - master
---

# Creator OS Master Recovery Prompt

Use this prompt whenever the vault needs to be rebuilt, recovered, or recreated after loss/corruption, or when a new AI session needs to reconstruct the full YouTube Creator OS safely and in add-only mode.

## Master prompt

You are helping maintain an Obsidian vault for a Portuguese-language YouTube creator channel called Imprensa de Destruição em Massa. Your task is to recreate and maintain the YouTube Creator OS inside the existing vault without deleting, renaming, or reorganizing any existing files unless the user explicitly asks. Only add new notes, templates, bases, boards, prompts, and supporting assets.

Core requirements:
- Preserve the current vault organization.
- Add only; do not remove existing content.
- Keep all legacy TXT prompts as references.
- Create reusable notes, templates, boards, dashboards, and workflows.
- Keep everything linked from a central hub note.
- Maintain a creator operations log for every meaningful change.
- Update this prompt whenever any new durable part of the system is added.

The system should include and preserve:
- `Notes/YouTube Creator OS.md` as the main hub
- `Notes/Content Calendar Dashboard.md` as the planning dashboard
- `Notes/YouTube Creator OS Manual.md` as the usage manual
- `Notes/Creator Operations Log.md` as the change log
- `Notes/Weekly Content Planner.md` and `Notes/Monthly Content Planner.md`
- `Notes/Monthly Content Command Center.md`
- `Notes/Video Launch QA Checklist.md`
- `Notes/Content Naming Convention.md`
- `Notes/Podcast Guest Database.md`
- `Notes/Prompt Migration Index.md`
- `Notes/Guest Outreach & Booking Workflow.md`
- `Notes/Research Dossier Guide.md`
- `Notes/New Video Starter Pack.md`
- `Notes/Video Project Folder Blueprint.md`
- `Notes/Start Here.md`
- `Notes/New Video Project Launcher.md`
- `Notes/New Video Project Click Launcher.md`
- `Notes/New Video Project Control Center.md`
- `Notes/New Video Project Plugin.md`

Templates and boards that must remain in the system:
- `Templates/YouTube Content Workflow Template.md`
- `Templates/YouTube Content Kanban.md`
- `Templates/YouTube Livestream Kanban.md`
- `Templates/Podcast Guest Kanban.md`
- `Templates/Repurposing Kanban.md`
- `Templates/Content Pipeline Board.md`
- `Templates/Video Launch QA Kanban.md`
- `Templates/Livestream Launch QA Kanban.md`
- `Templates/Guest Outreach Kanban.md`
- `Templates/Research Dossier Template.md`
- `Templates/New Video Starter Pack Template.md`
- `Templates/New Video Project Folder Template.md`
- `Templates/Monthly Content Command Center Template.md`

Prompt notes that must remain standardized in Markdown:
- `Prompts/YouTube Description Generator.md`
- `Prompts/YouTube Script Generator.md`
- `Prompts/YouTube Thumbnail Generator.md`
- `Prompts/YouTube Repurposing Generator.md`
- `Prompts/Podcast Guest Research Generator.md`
- `Prompts/Podcast Caricature Poster Generator.md`
- `Prompts/Channel Positioning Generator.md`

Legacy TXT prompt references to preserve:
- `Harpa Video Description.txt`
- `SEO e criação de imagem.txt`
- `Agente_KENT_Prompt.txt`
- `Create a high-end 4K-style vertical caricatures.txt`

Project folder system to preserve:
- `Projects/Video Projects/_TEMPLATE - New Video Project/`
- A dated project folder structure using the template as the source for new projects
- Local notes for theme, research, script, packaging, QA, repurposing, analytics, archive, and AI prompt generation

Automation and launcher system to preserve:
- `References/Automation/create_video_project.py`
- `C:\Users\msoares\Downloads\NewVideoProjectLauncher.bat`
- `.obsidian/plugins/new-video-project-launcher/`

The one-click launcher plugin should:
- provide ribbon buttons for Video, Livestream, and Guest episode
- provide matching command palette commands
- ask for theme, guest choice, and date
- create the project folder from the template
- seed the idea note with starter prompts
- generate a project-local AI prompt note
- optionally open the new folder in the system explorer
- copy the AI prompt to the clipboard when possible
- open `00 - Project Hub.md` after creation

If rebuilding from scratch, do it in this order:
1. Inspect the vault and existing conventions.
2. Read representative template/base notes first.
3. Recreate or verify the hub, dashboard, manual, and log.
4. Recreate the workflow notes, planners, QA, naming, guest database, research guide, and prompt migration index.
5. Recreate the prompt library in Markdown.
6. Recreate the project folder template and automation path.
7. Recreate the launcher note and plugin notes.
8. Verify each file exists and link everything from the hub and dashboard.
9. Record the work in the operations log.
10. Update this recovery prompt with any new durable file, workflow, or launcher you add.

## Current creator OS summary

The vault is organized around a channel operating system for:
- geopolitical analysis
- urgent news coverage
- interviews and guest episodes
- livestreams
- shorts and repurposing
- research and packaging
- planning and analytics

The user prefers:
- structured notes
- reusable templates
- additive changes only
- clear manuals and dashboards
- a system that can keep growing without breaking older notes

## Update rule

Whenever a new durable note, template, workflow, board, automation, or plugin is added, you must update this file and the Creator Operations Log.

Add a new bullet under `## Future additions` for every meaningful new development.

## Current inventory

- Main hub: `YouTube Creator OS`
- Dashboard: `Content Calendar Dashboard`
- Manual: `YouTube Creator OS Manual`
- Log: `Creator Operations Log`
- Start here: `Start Here`
- Control center: `New Video Project Control Center`
- Click launcher: `New Video Project Click Launcher`
- Manual launcher note: `New Video Project Launcher`
- Plugin docs: `New Video Project Plugin`
- Starter pack: `New Video Starter Pack`
- Monthly command center: `Monthly Content Command Center`
- Pipeline board: `Content Pipeline Board`
- QA: `Video Launch QA Checklist`
- Guest workflow: `Guest Outreach & Booking Workflow`
- Research guide: `Research Dossier Guide`
- Project blueprint: `Video Project Folder Blueprint`
- Project AI prompt file: `09 - AI Generation Prompt.md`
- Prompt migration index: `Prompt Migration Index`
- Guest database: `Podcast Guest Database`

## Future additions

- Add new durable notes and templates here.
- Add any new automation, launcher, plugin, or board here.
- Keep this list synchronized with the manual and operations log.
