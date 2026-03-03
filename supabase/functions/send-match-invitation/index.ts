// Edge Function: Send Match Invitation Email
// This function sends an email to the opponent when a match is created

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { invitationId, challengerName, opponentEmail, matchConfig } = await req.json()

        if (!invitationId || !opponentEmail) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // Get Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

        if (!supabaseUrl || !supabaseServiceKey) {
            return new Response(
                JSON.stringify({ error: 'Server configuration error' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            )
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Get site URL from request headers or use default
        const host = req.headers.get('host') || 'localhost:3000'
        const protocol = host.includes('localhost') ? 'http' : 'https'
        const siteUrl = `${protocol}://${host}`

        // Build invitation links
        const acceptUrl = `${siteUrl}/match/invite?token=${invitationId}&action=accept`
        const declineUrl = `${siteUrl}/match/invite?token=${invitationId}&action=decline`

        // Format match config for display
        const configText = `${matchConfig.distance}m, ${matchConfig.endsCount} ends, ${matchConfig.arrowsPerEnd} arrows per end`

        // Send email using Supabase's built-in email service
        // Note: This requires configuring a custom email template in Supabase Dashboard
        // For now, we'll use the auth admin API to send a custom email
        const { error: emailError } = await supabase.auth.admin.sendRawEmail({
            to: opponentEmail,
            subject: `${challengerName} challenged you to an archery match! 🏹`,
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Match Invitation</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2d4a3e; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .match-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2d4a3e; }
        .button { display: inline-block; padding: 12px 30px; margin: 10px 5px; text-decoration: none; border-radius: 6px; font-weight: 600; }
        .accept { background: #2d4a3e; color: white; }
        .decline { background: #e5e5e5; color: #666; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #999; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏹 ArrowLog Match Invitation</h1>
    </div>
    <div class="content">
        <p>Hi there!</p>
        <p><strong>${challengerName}</strong> has invited you to a 1-vs-1 archery match on ArrowLog.</p>
        
        <div class="match-details">
            <h3>Match Details:</h3>
            <ul>
                <li><strong>Distance:</strong> ${matchConfig.distance} meters</li>
                <li><strong>Ends:</strong> ${matchConfig.endsCount}</li>
                <li><strong>Arrows per end:</strong> ${matchConfig.arrowsPerEnd}</li>
            </ul>
        </div>
        
        <p>Accept the challenge and show your skills!</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${acceptUrl}" class="button accept">Accept Challenge</a>
            <a href="${declineUrl}" class="button decline">Decline</a>
        </div>
        
        <p style="font-size: 14px; color: #666;">
            <strong>Note:</strong> This invitation expires in 1 hour.
        </p>
        
        <p style="font-size: 14px; color: #666; margin-top: 20px;">
            If the buttons don't work, copy and paste this link into your browser:<br>
            <a href="${acceptUrl}">${acceptUrl}</a>
        </p>
    </div>
    <div class="footer">
        <p>ArrowLog - Track your archery progress</p>
        <p>This email was sent because someone invited you to a match on ArrowLog.</p>
    </div>
</body>
</html>
            `,
        })

        if (emailError) {
            console.error('Error sending email:', emailError)
            return new Response(
                JSON.stringify({ error: 'Failed to send email', details: emailError.message }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            )
        }

        return new Response(
            JSON.stringify({ success: true, message: 'Invitation email sent' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        console.error('Unexpected error:', error)
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
