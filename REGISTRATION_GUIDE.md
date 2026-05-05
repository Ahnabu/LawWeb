# User Registration System - Implementation Guide

## ✅ What's Been Implemented

### Backend (Already Existed)
- ✅ `POST /api/auth/register` - Registration endpoint
- ✅ Validation schema for registration data
- ✅ Password hashing with bcrypt
- ✅ Automatic JWT token generation and cookie setting
- ✅ Role-based user creation (client, lawyer, admin)
- ✅ Optional fields for phone and barId

### Frontend (Just Added)

#### 1. Registration Function (`frontend/lib/auth.ts`)
```typescript
export async function signUp(
  name: string,
  email: string,
  password: string,
  role: 'admin' | 'lawyer' | 'client' = 'client',
  phone?: string,
  barId?: string,
): Promise<LoginResponse>
```

#### 2. Registration Page (`frontend/app/register/page.tsx`)
- **Role Selection Tabs**: Client, Lawyer, Admin
- **Required Fields**:
  - Full Name (2-100 characters)
  - Email (valid email format)
  - Password (8+ chars, uppercase, lowercase, number, special character)
  - Confirm Password
  - Bar ID (only for lawyers)
- **Optional Fields**:
  - Phone Number
- **Features**:
  - Real-time password strength indicator
  - Form validation before submission
  - Error display
  - Loading state
  - Automatic redirect to dashboard after registration

#### 3. Login Page Update
- Added "Create one here" link to registration page

## Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&)

## Registration Flow

```
User → /register page
  ↓
Select Role (Client/Lawyer/Admin)
  ↓
Fill Form with Validation
  ↓
Submit → POST /api/auth/register
  ↓
Backend Creates User & Sets Cookies
  ↓
Frontend Calls signUp() → Gets User Data
  ↓
User Logged In & Redirected to Dashboard
```

## Role-Specific Fields

### Client
- Name, Email, Password, Phone (optional)

### Lawyer
- Name, Email, Password, Phone (optional), **Bar ID (required)**

### Admin
- Name, Email, Password, Phone (optional)

## Error Handling
- Duplicate email prevention (409 conflict)
- Input validation with specific error messages
- Network error handling
- User feedback on all errors

## Testing Registration

1. **Start Backend**: `npm run dev:watch` (in backend folder)
2. **Start Frontend**: `npm run dev` (in frontend folder)
3. **Navigate to**: `http://localhost:3000/register`
4. **Test Scenarios**:
   - ✓ Register as Client
   - ✓ Register as Lawyer (with Bar ID)
   - ✓ Verify password requirements are enforced
   - ✓ Test duplicate email prevention
   - ✓ Verify automatic redirect to dashboard after registration
   - ✓ Check cookies are set correctly

## Security Features
- Passwords hashed with bcrypt (salt: 12)
- HTTP-only secure cookies
- CORS protection
- Rate limiting on auth routes (5 attempts per 15 min)
- Input validation on both client and server
- CSRF protection with SameSite cookies

## Database User Schema
```
{
  _id: ObjectId
  name: String (required)
  email: String (required, unique)
  password: String (required, hashed)
  role: String (admin | lawyer | client, default: client)
  barId: String (optional, for lawyers)
  phone: String (optional)
  isVerified: Boolean (default: false)
  createdAt: Date
  updatedAt: Date
}
```

## Next Steps (Optional Enhancements)
- [ ] Email verification before account activation
- [ ] Forgot password functionality
- [ ] Social login (Google, Microsoft)
- [ ] Profile picture upload
- [ ] Lawyer verification process
- [ ] Admin dashboard for user management
