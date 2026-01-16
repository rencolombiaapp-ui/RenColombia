export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: "tenant" | "landlord"
          publisher_type: "individual" | "inmobiliaria"
          company_name: string | null
          company_logo: string | null
          phone: string | null
          address: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: "tenant" | "landlord"
          publisher_type?: "individual" | "inmobiliaria"
          company_name?: string | null
          company_logo?: string | null
          phone?: string | null
          address?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: "tenant" | "landlord"
          publisher_type?: "individual" | "inmobiliaria"
          company_name?: string | null
          company_logo?: string | null
          phone?: string | null
          address?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          id: string
          owner_id: string
          title: string
          description: string | null
          city: string
          neighborhood: string | null
          address: string | null
          price: number
          property_type: "apartamento" | "casa" | "apartaestudio" | "local" | "loft" | "penthouse"
          bedrooms: number
          bathrooms: number
          area: number | null
          status: "draft" | "published" | "rented" | "paused"
          is_featured: boolean
          featured_until: string | null
          views_count: number
          departamento: string | null
          municipio: string | null
          tiene_parqueadero: boolean
          cantidad_parqueaderos: number | null
          estrato: number | null
          incluye_administracion: boolean
          valor_administracion: number | null
          caracteristicas: string[] | null
          latitude: number | null
          longitude: number | null
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          title: string
          description?: string | null
          city: string
          neighborhood?: string | null
          address?: string | null
          price: number
          property_type?: "apartamento" | "casa" | "apartaestudio" | "local" | "loft" | "penthouse"
          bedrooms?: number
          bathrooms?: number
          area?: number | null
          status?: "draft" | "published" | "rented" | "paused"
          is_featured?: boolean
          featured_until?: string | null
          views_count?: number
          departamento?: string | null
          municipio?: string | null
          tiene_parqueadero?: boolean
          cantidad_parqueaderos?: number | null
          estrato?: number | null
          incluye_administracion?: boolean
          valor_administracion?: number | null
          caracteristicas?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          title?: string
          description?: string | null
          city?: string
          neighborhood?: string | null
          address?: string | null
          price?: number
          property_type?: "apartamento" | "casa" | "apartaestudio" | "local" | "loft" | "penthouse"
          bedrooms?: number
          bathrooms?: number
          area?: number | null
          status?: "draft" | "published" | "rented" | "paused"
          is_featured?: boolean
          featured_until?: string | null
          views_count?: number
          departamento?: string | null
          municipio?: string | null
          tiene_parqueadero?: boolean
          cantidad_parqueaderos?: number | null
          estrato?: number | null
          incluye_administracion?: boolean
          valor_administracion?: number | null
          caracteristicas?: string[] | null
          latitude?: number | null
          longitude?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      property_images: {
        Row: {
          id: string
          property_id: string
          url: string
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: string
          property_id: string
          url: string
          is_primary?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          url?: string
          is_primary?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          }
        ]
      }
      favorites: {
        Row: {
          id: string
          user_id: string
          property_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          property_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          property_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          }
        ]
      }
      reviews: {
        Row: {
          id: string
          user_id: string
          rating: number
          comment: string | null
          user_type: "inquilino" | "propietario" | "inmobiliaria"
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          rating: number
          comment?: string | null
          user_type: "inquilino" | "propietario" | "inmobiliaria"
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          rating?: number
          comment?: string | null
          user_type?: "inquilino" | "propietario" | "inmobiliaria"
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      chatbot_feedback: {
        Row: {
          id: string
          user_id: string | null
          rating: number | null
          comment: string | null
          interaction_type: "search" | "faq"
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          rating?: number | null
          comment?: string | null
          interaction_type?: "search" | "faq"
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          rating?: number | null
          comment?: string | null
          interaction_type?: "search" | "faq"
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types para usar fácilmente
export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type Property = Database["public"]["Tables"]["properties"]["Row"]
export type PropertyImage = Database["public"]["Tables"]["property_images"]["Row"]
export type Favorite = Database["public"]["Tables"]["favorites"]["Row"]
export type Review = Database["public"]["Tables"]["reviews"]["Row"]

export type PropertyInsert = Database["public"]["Tables"]["properties"]["Insert"]
export type PropertyUpdate = Database["public"]["Tables"]["properties"]["Update"]
export type FavoriteInsert = Database["public"]["Tables"]["favorites"]["Insert"]
export type ReviewInsert = Database["public"]["Tables"]["reviews"]["Insert"]

// Tipo extendido para reviews con información del usuario
export type ReviewWithUser = Review & {
  profiles: Profile
}

// Tipo extendido para propiedades con imágenes
export type PropertyWithImages = Property & {
  property_images: PropertyImage[]
  profiles?: Profile
}
