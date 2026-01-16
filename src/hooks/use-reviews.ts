import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import type { ReviewInsert, ReviewWithUser } from "@/integrations/supabase/types";

// Hook para obtener todas las reviews públicas (para mostrar en landing)
export function useReviews() {
  return useQuery({
    queryKey: ["reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select(`
          *,
          profiles (*)
        `)
        .order("created_at", { ascending: false })
        .limit(10); // Limitar a 10 reviews más recientes

      if (error) {
        console.error("Error fetching reviews:", error);
        return [];
      }

      return (data || []) as ReviewWithUser[];
    },
  });
}

// Hook para verificar si el usuario actual ya tiene una review
export function useUserReview() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-review", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        // Si no encuentra review, retornar null (no es un error)
        if (error.code === "PGRST116") {
          return null;
        }
        console.error("Error fetching user review:", error);
        return null;
      }

      return data;
    },
    enabled: !!user,
  });
}

// Hook para crear una review
export function useCreateReview() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (review: {
      rating: number;
      comment?: string;
      user_type: "inquilino" | "propietario" | "inmobiliaria";
    }) => {
      if (!user) {
        throw new Error("Usuario no autenticado");
      }

      const { data, error } = await supabase
        .from("reviews")
        .insert({
          user_id: user.id,
          rating: review.rating,
          comment: review.comment || null,
          user_type: review.user_type,
        })
        .select()
        .single();

      if (error) {
        // Si ya existe una review, mostrar mensaje específico
        if (error.code === "23505") {
          throw new Error("Ya has enviado una calificación anteriormente.");
        }
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["user-review"] });

      toast({
        title: "¡Gracias por tu calificación!",
        description: "Tu opinión nos ayuda a mejorar.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });
}
