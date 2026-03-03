// ============================================
// TypeScript Types for 1-vs-1 Match Feature
// ============================================

import { Database } from './database.types';

// ============================================
// Database Row Types (from Supabase)
// ============================================

export type MatchRow = Database['public']['Tables']['matches']['Row'];
export type MatchInsert = Database['public']['Tables']['matches']['Insert'];
export type MatchUpdate = Database['public']['Tables']['matches']['Update'];

export type MatchInvitationRow = Database['public']['Tables']['match_invitations']['Row'];
export type MatchInvitationInsert = Database['public']['Tables']['match_invitations']['Insert'];
export type MatchInvitationUpdate = Database['public']['Tables']['match_invitations']['Update'];

// ============================================
// Match Status Enum
// ============================================

export type MatchStatus = 'pending' | 'accepted' | 'active' | 'completed' | 'cancelled';

export const MatchStatusLabels: Record<MatchStatus, string> = {
    pending: 'Waiting for opponent',
    accepted: 'Match accepted',
    active: 'Match in progress',
    completed: 'Match completed',
    cancelled: 'Match cancelled',
};

// ============================================
// Invitation Status Enum
// ============================================

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'declined';

// ============================================
// Match Configuration
// ============================================

export interface MatchConfig {
    distance: number;        // in meters (default: 18)
    endsCount: number;       // number of ends (default: 2)
    arrowsPerEnd: number;    // arrows per end (default: 5)
}

export const DEFAULT_MATCH_CONFIG: MatchConfig = {
    distance: 18,
    endsCount: 2,
    arrowsPerEnd: 5,
};

// ============================================
// API Input Types
// ============================================

export interface CreateMatchInput {
    opponentEmail: string;
    config: MatchConfig;
}

export interface AcceptInvitationInput {
    invitationId: string;
}

export interface DeclineInvitationInput {
    invitationId: string;
}

export interface CancelMatchInput {
    matchId: string;
    reason?: string;
}

export interface SubmitMatchScoresInput {
    matchId: string;
}

export interface GetMatchInput {
    matchId: string;
}

export interface ListMatchesInput {
    status?: 'active' | 'completed' | 'cancelled' | 'all';
    limit?: number;
    offset?: number;
}

// ============================================
// API Response Types
// ============================================

export interface CreateMatchResponse {
    matchId: string;
    error?: string;
}

export interface AcceptInvitationResponse {
    matchId: string;
    error?: string;
}

export interface SubmitMatchScoresResponse {
    status: 'waiting' | 'completed';
    opponentSubmitted?: boolean;
    error?: string;
}

// ============================================
// Enriched Match Types (with related data)
// ============================================

export interface MatchWithPlayers extends MatchRow {
    challenger: {
        id: string;
        full_name: string | null;
        avatar_url: string | null;
    } | null;
    opponent: {
        id: string;
        full_name: string | null;
        avatar_url: string | null;
    } | null;
    winner: {
        id: string;
        full_name: string | null;
    } | null;
}

export interface MatchWithSessions extends MatchWithPlayers {
    challenger_session: {
        id: string;
        session_date: string;
        is_submitted_to_match: boolean;
        submitted_at: string | null;
    } | null;
    opponent_session: {
        id: string;
        session_date: string;
        is_submitted_to_match: boolean;
        submitted_at: string | null;
    } | null;
}

export interface MatchDetails extends MatchWithSessions {
    // Calculated fields
    yourScore?: number;
    opponentScore?: number;
    yourXCount?: number;
    opponentXCount?: number;
    isWinner?: boolean;
    isLoser?: boolean;
    isTie?: boolean;
    yourSubmitted?: boolean;
    opponentSubmitted?: boolean;
}

// ============================================
// Invitation with Match Info
// ============================================

export interface InvitationWithMatch extends MatchInvitationRow {
    match: {
        id: string;
        config_distance: number;
        config_ends_count: number;
        config_arrows_per_end: number;
        challenger: {
            id: string;
            full_name: string | null;
        } | null;
    } | null;
}

// ============================================
// Dashboard Types
// ============================================

export interface ActiveMatchInfo {
    matchId: string;
    opponentName: string;
    opponentAvatar: string | null;
    status: MatchStatus;
    config: MatchConfig;
    yourSessionId: string;
    opponentSessionId: string | null;
    yourSubmitted: boolean;
    opponentSubmitted: boolean;
}

// ============================================
// Helper Types
// ============================================

export interface MatchResult {
    winnerId: string | null;
    isTie: boolean;
    challengerTotal: number;
    opponentTotal: number;
    challengerXCount: number;
    opponentXCount: number;
}

export interface CanCreateMatchResult {
    canCreate: boolean;
    reason?: 'NOT_AUTHENTICATED' | 'HAS_ACTIVE_MATCH' | 'ALREADY_INVITED' | 'CHECK_ERROR';
    activeMatchId?: string;
}
