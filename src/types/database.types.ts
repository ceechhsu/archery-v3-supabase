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
                }
                Insert: {
                    id?: string
                    user_id?: string
                    session_date?: string
                    distance?: number | null
                    notes?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    session_date?: string
                    distance?: number | null
                    notes?: string | null
                    created_at?: string
                    updated_at?: string
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
        }
    }
}
