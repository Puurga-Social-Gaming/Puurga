## API Documentation

### Authentication

**POST /api/login**
- Request:  ```json
  { "email": "user@example.com", "password": "Password123!" }  ```
- Response:  ```json
  {
    "token": "jwt.token.here",
    "user": { /* user object */ }
  }  ```

### Posts

**GET /api/posts/feed**
- Requires authentication
- Returns paginated posts
- Query params:
  - page: number (default 1)
  - limit: number (default 20)

**POST /api/posts**
- Request body:  ```json
  {
    "content": "Post content",
    "images": ["url1", "url2"],
    "visibility": "public"
  }  ``` 