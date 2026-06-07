// Edge Function: manage-scorekeepers
// Handles create / update / delete for scorekeeper auth accounts.
//
// Deploy:  supabase functions deploy manage-scorekeepers
//
// Required Supabase secrets (supabase secrets set KEY=value):
//   SUPABASE_URL              — set automatically by Supabase
//   SUPABASE_SERVICE_ROLE_KEY — set automatically by Supabase
//   APP_URL                   — e.g. https://your-app.vercel.app   (for email links)
//   RESEND_API_KEY            — optional; if set, emails credentials to new scorekeepers
//
// If RESEND_API_KEY is not set, the generated password is returned to the admin UI
// and the admin must share it manually.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function generatePassword(): string {
  // Uses Web Crypto so it's available in Deno
  const chars =
    "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  const arr = new Uint8Array(14);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => chars[b % chars.length])
    .join("");
}

async function sendEmail(
  resendKey: string,
  to: string,
  email: string,
  password: string,
  tableNumber: number | null,
  appUrl: string,
): Promise<boolean> {
  const tableNote = tableNumber
    ? `<p>You have been assigned to <strong>Table ${tableNumber}</strong>.</p>`
    : "";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "AI for Good <onboarding@resend.dev>",
      to: [to],
      subject: "Your Scorekeeper Account — AI for Good",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#1a1a1a">You've been added as a scorekeeper</h2>
          <p>Sign in at <a href="${appUrl}/login">${appUrl}/login</a> using:</p>
          <table style="border-collapse:collapse;margin:16px 0">
            <tr>
              <td style="padding:6px 12px 6px 0;color:#666;font-size:13px">Email</td>
              <td style="padding:6px 0;font-weight:bold">${email}</td>
            </tr>
            <tr>
              <td style="padding:6px 12px 6px 0;color:#666;font-size:13px">Password</td>
              <td style="padding:6px 0;font-family:monospace;font-size:18px;letter-spacing:2px;font-weight:bold">${password}</td>
            </tr>
          </table>
          ${tableNote}
          <p style="color:#888;font-size:12px">Please change your password after your first sign-in.</p>
        </div>
      `,
    }),
  });
  return res.ok;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Verify caller holds a valid JWT and is an admin
  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user: caller },
    error: authError,
  } = await adminClient.auth.getUser(token);
  if (authError || !caller) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  const { data: callerProfile } = await adminClient
    .from("user_profiles")
    .select("role")
    .eq("id", caller.id)
    .single();

  if (callerProfile?.role !== "admin") {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: corsHeaders,
    });
  }

  const body = await req.json();
  const { action } = body;

  try {
    // ── Create ─────────────────────────────────────────────────────────────────
    if (action === "create") {
      const { email, table_number } = body as {
        email: string;
        table_number: number | null;
      };

      const password = generatePassword();

      const { data: newUser, error: createError } =
        await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

      if (createError || !newUser?.user) {
        return new Response(
          JSON.stringify({ error: createError?.message ?? "User creation failed" }),
          { status: 400, headers: corsHeaders },
        );
      }

      await adminClient.from("user_profiles").insert({
        id: newUser.user.id,
        role: "scorekeeper",
        table_number: table_number ?? null,
        email,
      });

      let emailSent = false;
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        const appUrl =
          Deno.env.get("APP_URL") ?? "https://your-app.vercel.app";
        emailSent = await sendEmail(
          resendKey,
          email,
          email,
          password,
          table_number ?? null,
          appUrl,
        );
      }

      return new Response(
        JSON.stringify({
          password,
          emailSent,
          user: { id: newUser.user.id, email },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── Delete ─────────────────────────────────────────────────────────────────
    if (action === "delete") {
      const { userId } = body as { userId: string };
      const { error } = await adminClient.auth.admin.deleteUser(userId);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: corsHeaders,
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Update ─────────────────────────────────────────────────────────────────
    if (action === "update") {
      const { userId, table_number, email } = body as {
        userId: string;
        table_number?: number | null;
        email?: string;
      };

      if (email) {
        await adminClient.auth.admin.updateUserById(userId, { email });
      }

      const updates: Record<string, unknown> = {};
      if (table_number !== undefined) updates.table_number = table_number;
      if (email !== undefined) updates.email = email;

      if (Object.keys(updates).length > 0) {
        await adminClient
          .from("user_profiles")
          .update(updates)
          .eq("id", userId);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: corsHeaders,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
