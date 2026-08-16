# Bengazy Arts Portfolio

A portfolio and commission site for a pencil artist with:

- gallery modal and artwork detail view
- artist admin login
- tutorial links and social embeds
- live server-backed storage for artworks and tutorials

## Features

- Clickable gallery cards with pop-up detail modal
- Progress images shown with the final cover image
- Artist admin panel for uploads
- Tutorial links for YouTube, Vimeo, Instagram, or direct URLs
- Secure token-based admin login

## Run locally

1. Open a terminal in the project folder.
2. Start the backend server:

```bash
python server.py
```

3. Open:

```text
http://localhost:8000/
```

4. Open the admin panel here:

```text
http://localhost:8000/admin.html
```

5. Login with the default admin password:

```text
admin123
```

## API

The app exposes a small API for the admin panel and gallery rendering:

- `GET /api/health`
- `POST /api/login`
- `GET /api/gallery`
- `POST /api/gallery`
- `GET /api/tutorials`
- `POST /api/tutorials`

## Notes

- The current admin flow stores the password and data in a local server-backed JSON file for easy local setup.
- For production, replace the local storage with a real database and secure server deployment.
