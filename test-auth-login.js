const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function getAuthToken() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ACCESS_TOKEN || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    // Create an admin client to fetch user details
    const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey);

    // Fetch user by email
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) {
        console.error("Error fetching users:", error);
        return;
    }

    const ceechUser = users.users.find(u => u.email === 'ceechmission@gmail.com');
    if (!ceechUser) {
        console.error("User ceechmission@gmail.com not found");
        return;
    }

    console.log("Found User ID:", ceechUser.id);
    
    // Create a magic link or just generate a dev access token script we can inject
    // Actually the fastest way is to just create a dummy "impersonation" route in Next.js
    
    const impersonateRoute = `
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function GET(request: Request) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookieStore.set(name, value, options)
                    })
                },
            },
        }
    )

    // Force sign in as the user
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: 'ceechmission@gmail.com',
    })
    
    if (error || !data?.properties?.action_link) {
       return new Response("Auth Error: " + JSON.stringify(error), { status: 500 })
    }

    // Redirect to the magic link to set cookies automatically
    redirect(data.properties.action_link)
}
`;
    
    fs.writeFileSync('src/app/api/dev-login/route.ts', impersonateRoute);
    console.log("Created API route at /api/dev-login to impersonate ceechmission@gmail.com");
}

getAuthToken();
