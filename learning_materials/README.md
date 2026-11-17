# What-If Tool — learning materials

Documentation, slide sets and narrated videos for the What-If Tool, one folder per audience.
Every guide and slide set comes as **Markdown**, **PDF** and (for slides) **PowerPoint**.

| Folder | For | Guide | Slides | Video |
|---|---|---|---|---|
| [`overview/`](overview/) | Anyone — a 6-minute introduction | — | [Markdown](overview/overview_slides.md) · [PDF](overview/overview_slides.pdf) · [PowerPoint](overview/overview_slides.pptx) (11 slides) | — |
| [`education/`](education/) | Teachers and course planners | [Markdown](education/education_user_guide.md) · [PDF](education/education_user_guide.pdf) | [Markdown](education/education_slides.md) · [PDF](education/education_slides.pdf) · [PowerPoint](education/education_slides.pptx) (8) | [MP4](education/education_tutorial.mp4), 2:40 |
| [`yard_logistics/`](yard_logistics/) | Yard and logistics planners | [Markdown](yard_logistics/yard_logistics_user_guide.md) · [PDF](yard_logistics/yard_logistics_user_guide.pdf) | [Markdown](yard_logistics/yard_logistics_slides.md) · [PDF](yard_logistics/yard_logistics_slides.pdf) · [PowerPoint](yard_logistics/yard_logistics_slides.pptx) (9) | [MP4](yard_logistics/yard_logistics_tutorial.mp4), 2:55 |
| [`checkin_logs/`](checkin_logs/) | Gate and check-in staff | [Markdown](checkin_logs/checkin_logs_user_guide.md) · [PDF](checkin_logs/checkin_logs_user_guide.pdf) | [Markdown](checkin_logs/checkin_logs_slides.md) · [PDF](checkin_logs/checkin_logs_slides.pdf) · [PowerPoint](checkin_logs/checkin_logs_slides.pptx) (8) | [MP4](checkin_logs/checkin_logs_tutorial.mp4), 2:53 |
| [`developer/`](developer/) | Developers integrating or extending the tool | [Markdown](developer/developer_guide.md) · [PDF](developer/developer_guide.pdf) | [Markdown](developer/developer_slides.md) · [PDF](developer/developer_slides.pdf) · [PowerPoint](developer/developer_slides.pptx) (13) | [MP4](developer/developer_tutorial.mp4), 3:33 |

## What each file is

- **`*_user_guide.md` / `developer_guide.md`** — the written guide; images in the folder's `images/`.
  The matching **`.pdf`** is the same guide typeset for print (A4).
- **`*_slides.pdf`** — the slide set as a vector PDF (1920 × 1080 pages, searchable text).
- **`*_slides.pptx`** — the same slides for PowerPoint or Keynote, with **speaker notes** on every slide.
  Each slide is a full-slide picture (its text is kept as alt text), so it presents exactly as designed
  but is not text-editable. For an editable deck, open the online slide set and use its export menu.
- **`*_slides.md`** — every slide as an image (`slides/`) followed by its speaker notes; handy for
  reading the talk track or reviewing on GitHub.
- **`*_tutorial.mp4`** — narrated walkthrough, 1920 × 1080, with an English subtitle track built in;
  **`*_tutorial.srt`** is the same subtitles as a separate file, **`narration_script.md`** the
  scene-by-scene script, and **`video_spec.json`** the scene definition the video was rendered from.

## Sources and facts

The guides and slide sets were written in Claude Docs and Claude Slides and exported here on
12 November 2026. Their numbers come from the demo data shipped with the repo (course CS-220,
yard `yard-sample-001`, kiosk log case `lt010-2025-2026`) and the code at that date.
All screenshots, including many not used here, are in [`../screenshots/`](../screenshots/README.md).

The AI answers shown in screenshots and videos are real output of the local model (phi4 via Ollama).
Some contain small mistakes — the materials point them out on purpose, because the AI is advisory.
