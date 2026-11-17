# Department Notice Board

A Flask + SQLite notice-board application packaged for Podman or Docker.

## Features

- Add notices with title, category and date
- List and search notices by title
- Edit and delete notices
- Mark notices active, expired or archived
- Filter by category
- Show active notices only
- Persist SQLite data in a Podman named volume

## Requirements

- Podman (or Docker)
- Terminal

## 1. Build the image

From this project directory:

```bash
podman build -t notice-board .
```

## 2. Create persistent storage

```bash
podman volume create notice_data
```

## 3. Run the application

```bash
podman run -d \
  --name department-notice-board \
  -p 5000:5000 \
  -v notice_data:/app/data \
  notice-board
```

Open http://localhost:5000

## 4. Useful commands

```bash
podman ps
podman logs department-notice-board
podman stop department-notice-board
podman start department-notice-board
```

## 5. Prove persistence after container recreation

First, add a test notice through the website. Then run:

```bash
podman rm -f department-notice-board
```

Recreate the container using the same named volume:

```bash
podman run -d \
  --name department-notice-board \
  -p 5000:5000 \
  -v notice_data:/app/data \
  notice-board
```

Refresh http://localhost:5000. The notice should still be present because the database is stored in `notice_data`, not in the container's writable layer.

**Important:** Do not run `podman volume rm notice_data` during this test. Removing the volume deletes the persisted database.

## 6. Stop and clean up

```bash
podman rm -f department-notice-board
```

This removes the container but keeps the data volume. To permanently remove the stored data as well:

```bash
podman volume rm notice_data
```

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/notices` | List/search/filter notices |
| POST | `/api/notices` | Create a notice |
| PUT | `/api/notices/<id>` | Edit a notice |
| PATCH | `/api/notices/<id>/status` | Change status |
| DELETE | `/api/notices/<id>` | Delete a notice |

Query parameters for GET `/api/notices`:
- `search=exam` searches titles
- `category=Academic` filters by category
- `active=true` returns only active notices

## Categories

Academic, Examination, Events, Placement and General.
