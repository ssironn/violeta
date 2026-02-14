# Publications & Social Feed

## Problem
Violeta is a LaTeX editor but has no way for users to share their work publicly or discover content from others. Users need a social layer: publish documents as typed posts (article, exercise list, study material, proof), browse a feed, like, comment, follow authors, and share links.

## Decisions
- **Snapshot model**: Publishing creates an immutable PDF copy. The original document remains editable but the publication does not change.
- **Storage**: PDF blob on server filesystem (`uploads/publications/`). Thumbnail generated server-side with Poppler.
- **Visibility**: Publication links are public (no auth). Feed and explore pages require login.
- **Feed**: Two feeds — "Following" (posts from followed users) and "Explore" (all publications, chronological).
- **Comments**: One level of replies (like YouTube). Flat list with optional `parent_id`.
- **Likes**: Toggle (like/unlike). Counter cache on publications table.
- **Author control**: Can delete publications at any time.

## Data Model

### publications
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| author_id | UUID | FK → users |
| document_id | UUID | FK → documents, nullable (reference to original) |
| title | varchar(255) | |
| abstract | text | Optional summary |
| type | enum | `article`, `exercise_list`, `study_material`, `proof` |
| pdf_path | varchar(500) | Filesystem path to PDF |
| thumbnail_path | varchar(500) | Filesystem path to thumbnail PNG |
| share_token | varchar(32) | Unique, for public link |
| like_count | int | Counter cache, default 0 |
| comment_count | int | Counter cache, default 0 |
| created_at | datetime | |

### publication_likes
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| publication_id | UUID | FK → publications |
| user_id | UUID | FK → users |
| created_at | datetime | |
| | | unique(publication_id, user_id) |

### publication_comments
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| publication_id | UUID | FK → publications |
| author_id | UUID | FK → users |
| parent_id | UUID | FK → publication_comments, nullable (for replies) |
| content | text | |
| created_at | datetime | |

### follows
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| follower_id | UUID | FK → users |
| following_id | UUID | FK → users |
| created_at | datetime | |
| | | unique(follower_id, following_id) |

## API Endpoints

### Publications
- `POST /api/publications` — Create (multipart: PDF blob + JSON metadata). Auth required.
- `GET /api/publications/feed` — Following feed, cursor-paginated. Auth required.
- `GET /api/publications/explore` — Global feed, cursor-paginated. Auth required.
- `GET /api/publications/{id}` — Single publication details. Auth required.
- `DELETE /api/publications/{id}` — Delete (author only). Auth required.
- `GET /api/p/{share_token}` — Public access via link. No auth.
- `GET /api/publications/{id}/pdf` — Serve PDF file. Public.
- `GET /api/publications/{id}/thumbnail` — Serve thumbnail PNG. Public.

### Likes
- `POST /api/publications/{id}/like` — Toggle like/unlike. Auth required.

### Comments
- `GET /api/publications/{id}/comments` — List comments, paginated. Auth required.
- `POST /api/publications/{id}/comments` — Create comment (body: content, parent_id?). Auth required.
- `DELETE /api/comments/{id}` — Delete comment (author only). Auth required.

### Follows
- `POST /api/users/{id}/follow` — Toggle follow/unfollow. Auth required.
- `GET /api/users/{id}/followers` — List followers. Auth required.
- `GET /api/users/{id}/following` — List following. Auth required.

### Profile
- `GET /api/users/{id}/profile` — Public profile (name, publications, follower/following counts).

### Pagination
Cursor-based using `created_at` + `id` for consistent performance.

## Frontend

### New Routes
| Route | Component | Auth | Purpose |
|-------|-----------|------|---------|
| `/feed` | FeedPage | Yes | Publications from followed users |
| `/explore` | ExplorePage | Yes | Global publication feed |
| `/publication/:id` | PublicationPage | Yes | Full publication view with PDF, likes, comments |
| `/p/:token` | PublicPublicationPage | No | Public link to publication |
| `/profile/:id` | ProfilePage | Yes | User profile with their publications |

### Key Components
- **PublishModal** — Triggered from editor toolbar. User picks type (article/exercise_list/study_material/proof), enters title, optional abstract. Sends compiled PDF blob.
- **FeedCard** — Thumbnail of first PDF page, title, type badge, author name, date, like/comment counters.
- **PublicationPage** — PDF viewer (iframe/embed), like button, comment section, share link button.
- **CommentSection** — Comment list with input. Each comment shows author, date, text, "Reply" button. Replies indented below parent.
- **ProfilePage** — User name, publication/follower/following counts, follow/unfollow button, publication grid.

### Publication Flow
```
Editor → Compile PDF → "Publish" button in toolbar
→ PublishModal (title, type, abstract)
→ POST /api/publications (multipart: PDF blob + metadata)
→ Redirect to PublicationPage
```

### PDF Display
Publications show PDF via `<iframe src="/api/publications/{id}/pdf">`. Public links use same approach — the PDF endpoint is public.

## File Storage

```
uploads/
  publications/
    {publication_id}.pdf
    {publication_id}_thumb.png
```

Thumbnail generated with `pdf2image` (Poppler). First page → PNG, 400px width. Docker image needs `poppler-utils`.

PDF and thumbnail endpoints return `FileResponse` with `Cache-Control: public, max-age=86400` (immutable snapshots).
