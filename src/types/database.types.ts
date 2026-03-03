export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            sessions: {
                Row: {
                    id: string
                    user_id: string
                    session_date: string
                    distance: number | null
                    notes: string | null
                    created_at: string
                    updated_at: string
                    // Match feature columns
                    match_id: string | null
                    is_submitted_to_match: boolean
                    submitted_at: string | null
                }
                Insert: {
                    id?: string
                    user_id?: string
                    session_date?: string
                    distance?: number | null
                    notes?: string | null
                    created_at?: string
                    updated_at?: string
                    // Match feature columns
                    match_id?: string | null
                    is_submitted_to_match?: boolean
                    submitted_at?: string | null
                }
                Update: {
                    id?: string
                    user_id?: string
                    session_date?: string
                    distance?: number | null
                    notes?: string | null
                    created_at?: string
                    updated_at?: string
                    // Match feature columns
                    match_id?: string | null
                    is_submitted_to_match?: boolean
                    submitted_at?: string | null
                }
            }
            ends: {
                Row: {
                    id: string
                    session_id: string
                    end_index: number
                    photo_url: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    session_id: string
                    end_index: number
                    photo_url?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    session_id?: string
                    end_index?: number
                    photo_url?: string | null
                    created_at?: string
                }
            }
            shots: {
                Row: {
                    id: string
                    end_id: string
                    shot_index: number
                    score: number
                    is_x: boolean
                    is_m: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    end_id: string
                    shot_index: number
                    score: number
                    is_x?: boolean
                    is_m?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    end_id?: string
                    shot_index?: number
                    score?: number
                    is_x?: boolean
                    is_m?: boolean
                    created_at?: string
                }
            }
            // ============================================
            // NEW: Match Feature Tables
            // ============================================
            matches: {
                Row: {
                    id: string
                    config_distance: number
                    config_ends_count: number
                    config_arrows_per_end: number
                    challenger_user_id: string
                    opponent_user_id: string | null
                    challenger_session_id: string | null
                    opponent_session_id: string | null
                    status: 'pending' | 'accepted' | 'active' | 'completed' | 'cancelled'
                    challenger_total: number | null
                    opponent_total: number | null
                    challenger_x_count: number | null
                    opponent_x_count: number | null
                    winner_user_id: string | null
                    is_tie: boolean
                    cancelled_by_user_id: string | null
                    cancelled_reason: string | null
                    invitation_expires_at: string
                    created_at: string
                    updated_at: string
                    accepted_at: string | null
                    completed_at: string | null
                    cancelled_at: string | null
                }
                Insert: {
                    id?: string
                    config_distance?: number
                    config_ends_count?: number
                    config_arrows_per_end?: number
                    challenger_user_id: string
                    opponent_user_id?: string | null
                    challenger_session_id?: string | null
                    opponent_session_id?: string | null
                    status?: 'pending' | 'accepted' | 'active' | 'completed' | 'cancelled'
                    challenger_total?: number | null
                    opponent_total?: number | null
                    challenger_x_count?: number | null
                    opponent_x_count?: number | null
                    winner_user_id?: string | null
                    is_tie?: boolean
                    cancelled_by_user_id?: string | null
                    cancelled_reason?: string | null
                    invitation_expires_at: string
                    created_at?: string
                    updated_at?: string
                    accepted_at?: string | null
                    completed_at?: string | null
                    cancelled_at?: string | null
                }
                Update: {
                    id?: string
                    config_distance?: number
                    config_ends_count?: number
                    config_arrows_per_end?: number
                    challenger_user_id?: string
                    opponent_user_id?: string | null
                    challenger_session_id?: string | null
                    opponent_session_id?: string | null
                    status?: 'pending' | 'accepted' | 'active' | 'completed' | 'cancelled'
                    challenger_total?: number | null
                    opponent_total?: number | null
                    challenger_x_count?: number | null
                    opponent_x_count?: number | null
                    winner_user_id?: string | null
                    is_tie?: boolean
                    cancelled_by_user_id?: string | null
                    cancelled_reason?: string | null
                    invitation_expires_at?: string
                    created_at?: string
                    updated_at?: string
                    accepted_at?: string | null
                    completed_at?: string | null
                    cancelled_at?: string | null
                }
            }
            match_invitations: {
                Row: {
                    id: string
                    match_id: string
                    invitee_email: string
                    invitee_user_id: string | null
                    status: 'pending' | 'accepted' | 'expired' | 'declined'
                    invited_at: string
                    responded_at: string | null
                    expires_at: string
                }
                Insert: {
                    id?: string
                    match_id: string
                    invitee_email: string
                    invitee_user_id?: string | null
                    status?: 'pending' | 'accepted' | 'expired' | 'declined'
                    invited_at?: string
                    responded_at?: string | null
                    expires_at: string
                }
                Update: {
                    id?: string
                    match_id?: string
                    invitee_email?: string
                    invitee_user_id?: string | null
                    status?: 'pending' | 'accepted' | 'expired' | 'declined'
                    invited_at?: string
                    responded_at?: string | null
                    expires_at?: string
                }
            }
        }
        Functions: {
            user_has_active_match: {
                Args: { p_user_id: string }
                Returns: boolean
            }
            get_user_active_match: {
                Args: { p_user_id: string }
                Returns: string
            }
            calculate_match_winner: {
                Args: { p_match_id: string }
                Returns: undefined
            }
        }
    }
}
