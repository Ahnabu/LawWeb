# Backend Development Prompt

## Quick Context

- **Framework**: Express.js, Node.js
- **Database**: MongoDB
- **Auth**: JWT + bcrypt
- **Response Format**: All responses must have `status`, `message`, `data`/`error`

## Response Format (Always)

### Success

```json
{
  "status": 200,
  "message": "Success message",
  "data": { "id": "123", "name": "John" }
}
```

### Error

```json
{
  "status": 400,
  "message": "Validation failed",
  "error": { "email": "Invalid email" }
}
```

## Endpoint Pattern

```javascript
app.post("/api/resource", authenticateToken, async (req, res) => {
  try {
    const { name, email } = req.body;

    // Validate
    if (!name || !email) {
      return res.status(400).json({
        status: 400,
        message: "Validation failed",
        error: { message: "Name and email required" },
      });
    }

    // Process
    const result = await Model.create({ name, email });

    res.status(201).json({
      status: 201,
      message: "Resource created",
      data: result,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      status: 500,
      message: "Internal server error",
      error: "Failed to create resource",
    });
  }
});
```

## Status Codes

- **200**: Success (GET, PUT)
- **201**: Created (POST)
- **400**: Bad request (validation)
- **401**: Unauthorized (auth)
- **404**: Not found
- **500**: Server error

## Common Validations

```javascript
// Email
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Bangladeshi phone
const phoneRegex = /^(\+?8801[3-9]\d{8}|01[3-9]\d{8})$/;

// Password (8+ chars, uppercase, lowercase, number, special)
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
```

## Files to Reference

- `backend/index.js` — server setup
- `backend/routes/` — existing endpoints (copy pattern)
- `backend/.env` — environment variables

## Rules

1. Always return proper status codes
2. Validate input on backend (don't trust frontend)
3. Never log sensitive data (passwords, tokens)
4. Use `try-catch` for all async operations
5. Return consistent response format
6. Handle errors gracefully
