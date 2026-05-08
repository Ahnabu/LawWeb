# Full-Stack Feature Implementation Prompt

## Goal

Build complete features end-to-end: API + Database + Frontend UI

## Workflow

### 1. Plan (10 min)

**Define the API contract FIRST:**

```
Endpoint: POST /api/appointments
Request: { lawyerId, date, time, message, clientEmail }
Response (201): { status, message, data: {...} }
Error (400): { status, message, error: {...} }
```

### 2. Backend (30 min)

```javascript
// 1. Create MongoDB schema
const appointmentSchema = new Schema({
  lawyerId: ObjectId,
  clientId: ObjectId,
  date: Date,
  time: String,
  message: String,
  status: { type: String, default: "pending" },
});

// 2. Create API endpoint
app.post("/api/appointments", authenticateToken, async (req, res) => {
  try {
    // Validate input
    // Save to database
    // Return response
  } catch (error) {
    // Error handling
  }
});

// 3. Test with Postman/curl
```

### 3. Frontend (30 min)

```tsx
// 1. Create API service
export async function bookAppointment(data) {
  const response = await fetch("/api/appointments", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return response.json();
}

// 2. Build UI component
export function AppointmentForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await bookAppointment(formData);
      // Success
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return <form onSubmit={handleSubmit}>{/* Form fields */}</form>;
}

// 3. Test on browser
```

### 4. Test End-to-End (10 min)

- Fill form → Submit → Check browser Network tab
- Verify API returns data → Verify database saved record
- Check UI handles loading/error states

---

## Common Features to Build

### Feature: Book Appointment

- **API**: POST /api/appointments
- **Database**: Appointment model
- **Frontend**: Appointment form
- **Special**: WhatsApp link integration

### Feature: Offline Case

- **API**: POST /api/cases
- **Database**: Case model
- **Frontend**: Offline case form (collect email)
- **Special**: Email notification to admin

### Feature: Lawyer Profile

- **API**: GET /api/lawyers/:id
- **Database**: Lawyer model
- **Frontend**: Lawyer details page
- **Special**: "Book Appointment" button

---

## Response Consistency

**ALL endpoints MUST return:**

```json
{
  "status": 200,
  "message": "Human-readable message",
  "data": { "id": "123" } OR "error": { "field": "error text" }
}
```

---

## Testing Checklist

- [ ] API endpoint works in Postman
- [ ] Database record created
- [ ] Frontend form submits successfully
- [ ] Loading state shows while submitting
- [ ] Error state shows if API fails
- [ ] Success message displays
- [ ] No console errors
- [ ] Mobile responsive
