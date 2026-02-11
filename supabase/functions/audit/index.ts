// supabase/functions/audit/index.ts
// Utility function for writing audit logs
// Triggered by: All other Edge Functions
//
// Purpose:
// - Centralized audit logging with service role access
// - Bypasses RLS policies to ensure all events are logged
// - Provides structured logging interface

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

type EventType =
  | "crawl_completed"
  | "submission_created"
  | "submission_screened"
  | "refinement_completed"
  | "voting_created"
  | "vote_cast"
  | "content_placed"
  | "revision_proposed"
  | "revision_approved"
  | "constitution_check"
  | "discussion_created"
  | "user_registered"
  | "user_banned"
  | "moderation_action"

type ActorType = "human" | "ai" | "system"
type SubjectType =
  | "submission"
  | "scripture_chunk"
  | "voting_session"
  | "revision_proposal"
  | "discussion"
  | "user"
  | "crawl_source"

interface AuditRequest {
  event_type: EventType
  actor_type: ActorType
  actor_id?: string  // null for system events
  subject_type?: SubjectType
  subject_id?: string
  details?: Record<string, any>
  ip_address?: string
}

interface AuditResponse {
  audit_id: string
  created_at: string
  success: boolean
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    )

    const {
      event_type,
      actor_type,
      actor_id,
      subject_type,
      subject_id,
      details,
      ip_address
    }: AuditRequest = await req.json()

    // Validation
    if (!event_type || !actor_type) {
      return new Response(
        JSON.stringify({ error: "event_type and actor_type are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      )
    }

    // Extract IP and User-Agent from request headers if not provided
    const rawIpAddress = ip_address || req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip")
    const userAgent = req.headers.get("user-agent") || "unknown"

    // Validate IP address format (basic check for INET compatibility)
    const finalIpAddress = rawIpAddress && /^[\d.:a-fA-F]+$/.test(rawIpAddress) ? rawIpAddress : null

    // Merge user_agent into details JSONB
    const finalDetails = {
      ...(details || {}),
      user_agent: userAgent
    }

    const { data, error } = await supabase
      .from("audit_logs")
      .insert({
        event_type,
        actor_type,
        actor_id: actor_id || null,
        subject_type: subject_type || null,
        subject_id: subject_id || null,
        details: finalDetails,
        ip_address: finalIpAddress
      })
      .select("id, created_at")
      .single()

    if (error) {
      console.error("Audit log insertion failed:", error)
      return new Response(
        JSON.stringify({ error: "Failed to write audit log", details: error.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
      )
    }

    const result: AuditResponse = {
      audit_id: data.id,
      created_at: data.created_at,
      success: true
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    )
  } catch (error) {
    console.error("Audit function error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    )
  }
})
