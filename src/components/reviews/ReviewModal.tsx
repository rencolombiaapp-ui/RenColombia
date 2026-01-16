import { useState } from "react";
import { Star, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCreateReview, useUserReview } from "@/hooks/use-reviews";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/hooks/use-profile";
import { useIsLandlord } from "@/hooks/use-my-properties";
import { cn } from "@/lib/utils";

interface ReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ReviewModal = ({ open, onOpenChange }: ReviewModalProps) => {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: userReview } = useUserReview();
  const { data: isLandlord } = useIsLandlord();
  const createReview = useCreateReview();

  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");

  // Si el usuario ya tiene una review, no mostrar el modal
  if (userReview) {
    return null;
  }

  // Determinar el tipo de usuario
  const getUserType = (): "inquilino" | "propietario" | "inmobiliaria" => {
    // Si es inmobiliaria, retornar inmobiliaria
    if (profile?.publisher_type === "inmobiliaria") {
      return "inmobiliaria";
    }
    // Si tiene propiedades publicadas (es landlord), es propietario
    if (isLandlord) {
      return "propietario";
    }
    // Si no tiene propiedades, es inquilino
    return "inquilino";
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      return;
    }

    await createReview.mutateAsync({
      rating,
      comment: comment.trim() || undefined,
      user_type: getUserType(),
    });

    // Cerrar modal y resetear estado
    onOpenChange(false);
    setRating(0);
    setComment("");
  };

  const handleClose = () => {
    onOpenChange(false);
    setRating(0);
    setComment("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>¿Cómo ha sido tu experiencia con RenColombia?</DialogTitle>
          <DialogDescription>
            Tu opinión nos ayuda a mejorar y a otros usuarios a conocer mejor nuestra plataforma.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Rating Stars */}
          <div className="space-y-2">
            <Label>Calificación</Label>
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      "w-8 h-8 transition-colors",
                      star <= (hoveredRating || rating)
                        ? "fill-accent text-accent"
                        : "text-muted-foreground"
                    )}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-center text-sm text-muted-foreground">
                {rating === 1 && "Muy malo"}
                {rating === 2 && "Malo"}
                {rating === 3 && "Regular"}
                {rating === 4 && "Bueno"}
                {rating === 5 && "Excelente"}
              </p>
            )}
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">Comentario (opcional)</Label>
            <Textarea
              id="comment"
              placeholder="Comparte tu experiencia..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[100px] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length} / 500
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Omitir
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || createReview.isPending}
          >
            {createReview.isPending ? "Enviando..." : "Enviar calificación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewModal;
