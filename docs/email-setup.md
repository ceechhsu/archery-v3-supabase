# Email Setup for Match Invitations

## Overview

This document describes how to configure email sending for match invitations in ArrowLog.

## Architecture

The email flow works as follows:

1. **User creates a match** → `createMatch()` server action
2. **Match and invitation created** in database
3. **Edge Function invoked** → `send-match-invitation`
4. **Email sent** to opponent with accept/decline links
5. **Opponent clicks link** → `/match/invite?token=xxx&action=accept`
6. **Invitation accepted/declined** → Match status updated

## Components

### 1. Edge Function: `send-match-invitation`

**Location:** `supabase/functions/send-match-invitation/index.ts`

This Edge Function:
- Receives invitation details (ID, challenger name, opponent email, config)
- Generates accept/decline URLs
- Sends HTML email with branded template

### 2. Invitation Handler Page

**Location:** `src/app/match/invite/page.tsx`

This page:
- Validates the invitation token
- Checks if user is logged in (redirects to login if not)
- Verifies the invitation belongs to the logged-in user
- Handles accept/decline actions
- Shows appropriate success/error messages

### 3. Email Template

The email includes:
- Challenger's name
- Match configuration (distance, ends, arrows)
- **Accept Challenge** button
- **Decline** button
- Expiration notice (1 hour)
- Direct link fallback

## Setup Instructions

### Step 1: Deploy the Edge Function

```bash
# Using Supabase CLI
supabase functions deploy send-match-invitation

# Or via MCP (if configured)
```

### Step 2: Configure Environment Variables

Ensure these environment variables are set in your Supabase project:

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Your Supabase project URL | ✅ Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for admin operations | ✅ Yes |

### Step 3: Set Up Email Provider

Supabase supports multiple email providers. Choose one:

#### Option A: Supabase Built-in Email (Default)
- Limited to 3 emails/hour on free tier
- Good for testing
- No additional setup required

#### Option B: Custom SMTP (Recommended for Production)

1. Go to [Supabase Dashboard → Auth → Email Templates](https://supabase.com/dashboard/project/_/auth/templates)
2. Configure SMTP settings:
   - Host: Your SMTP server
   - Port: 587 (STARTTLS) or 465 (SSL)
   - Username: Your SMTP username
   - Password: Your SMTP password
   - Sender: Your sender email address

**Recommended Providers:**
- [Resend](https://resend.com) - Free tier: 100 emails/day
- [SendGrid](https://sendgrid.com) - Free tier: 100 emails/day
- [AWS SES](https://aws.amazon.com/ses/) - Very cheap, 62,000 emails/month free

### Step 4: Test Email Sending

1. Create a match in the app
2. Enter your own email as the opponent
3. Check your inbox for the invitation email
4. Click accept/decline to verify links work

## Email Template Customization

The email template is defined in:
`supabase/functions/send-match-invitation/index.ts`

You can customize:
- Colors (currently uses brand green: `#2d4a3e`)
- Logo (add an `<img>` tag with your logo URL)
- Text content
- Button styles

## Troubleshooting

### Emails Not Sending

**Check Supabase Dashboard:**
1. Go to [Auth → Logs](https://supabase.com/dashboard/project/_/logs)
2. Look for email-related errors

**Common Issues:**

| Issue | Solution |
|-------|----------|
| Rate limit exceeded | Wait 1 hour or upgrade plan |
| SMTP not configured | Set up SMTP in Auth settings |
| Edge Function not deployed | Run `supabase functions deploy send-match-invitation` |
| Invalid API key | Check `SUPABASE_SERVICE_ROLE_KEY` |

### Links Not Working

**Accept/Decline Links:**
- Links expire after 1 hour
- User must be logged in to accept
- Invitation must be for the logged-in user's email

**Check URL format:**
```
http://localhost:3000/match/invite?token=INVITATION_ID&action=accept
```

### Edge Function Errors

**Check Edge Function Logs:**
1. Go to [Edge Functions → Logs](https://supabase.com/dashboard/project/_/functions)
2. Find `send-match-invitation`
3. Check recent invocations

## Security Considerations

1. **Invitation tokens** are UUIDs (unguessable)
2. **Links expire** after 1 hour
3. **User must verify** they own the invited email address
4. **RLS policies** prevent unauthorized access to matches
5. **Service role key** is only used server-side (Edge Function)

## Future Enhancements

- [ ] Add email preview in dashboard
- [ ] Add "remind opponent" button
- [ ] Support for email templates in dashboard
- [ ] Add email delivery tracking
- [ ] Support for SMS notifications (optional)

## Related Files

- `src/app/actions/matches.ts` - Server actions for match management
- `src/app/match/invite/page.tsx` - Invitation handler page
- `supabase/functions/send-match-invitation/index.ts` - Email sender
