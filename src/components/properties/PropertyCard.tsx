import { Heart, MapPin, BedDouble, Bath, Square, Star } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useFavoriteIds, useToggleFavorite } from "@/hooks/use-favorites";
import { useNavigate } from "react-router-dom";

interface PropertyCardProps {
  id: string;
  title: string;
  location: string;
  price: number;
  image: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  type: string;
  rating?: number;
  isNew?: boolean;
  isFeatured?: boolean;
}

const PropertyCard = ({
  id,
  title,
  location,
  price,
  image,
  bedrooms,
  bathrooms,
  area,
  type,
  rating,
  isNew,
  isFeatured,
}: PropertyCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: favoriteIds = [] } = useFavoriteIds();
  const toggleFavorite = useToggleFavorite();
  
  const isFavorite = favoriteIds.includes(id);
  const [imageLoaded, setImageLoaded] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <article className="group bg-card rounded-2xl overflow-hidden card-elevated border border-border/50">
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <div
          className={cn(
            "absolute inset-0 bg-muted animate-pulse",
            imageLoaded && "hidden"
          )}
        />
        <img
          src={image}
          alt={title}
          loading="lazy"
          decoding="async"
          className={cn(
            "w-full h-full object-cover transition-transform duration-500 group-hover:scale-110",
            !imageLoaded && "opacity-0"
          )}
          onLoad={() => setImageLoaded(true)}
        />
        
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {isNew && (
            <Badge className="bg-accent text-accent-foreground font-semibold shadow-md">
              Nuevo
            </Badge>
          )}
          {isFeatured && (
            <Badge className="bg-primary text-primary-foreground font-semibold shadow-md">
              Destacado
            </Badge>
          )}
        </div>

        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (!user) {
              navigate("/auth");
              return;
            }
            
            toggleFavorite.mutate({ propertyId: id, isFavorite });
          }}
          disabled={toggleFavorite.isPending}
          className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md hover:scale-110 transition-transform disabled:opacity-50"
        >
          <Heart
            className={cn(
              "w-5 h-5 transition-colors",
              isFavorite ? "fill-destructive text-destructive" : "text-muted-foreground"
            )}
          />
        </button>

        {/* Property Type Tag */}
        <div className="absolute bottom-3 left-3">
          <span className="px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm text-xs font-semibold text-foreground shadow-sm">
            {type}
          </span>
        </div>

        {/* Rating */}
        {rating && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-white/90 backdrop-blur-sm shadow-sm">
            <Star className="w-3.5 h-3.5 fill-accent text-accent" />
            <span className="text-xs font-semibold text-foreground">{rating}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 md:p-5 space-y-3">
        {/* Price */}
        <div className="flex items-baseline justify-between">
          <p className="text-xl md:text-2xl font-bold text-primary font-display">
            {formatPrice(price)}
            <span className="text-sm font-normal text-muted-foreground font-sans">/mes</span>
          </p>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
          {title}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm line-clamp-1">{location}</span>
        </div>

        {/* Features */}
        <div className="flex items-center gap-4 pt-3 border-t border-border">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <BedDouble className="w-4 h-4" />
            <span className="text-sm font-medium">{bedrooms}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Bath className="w-4 h-4" />
            <span className="text-sm font-medium">{bathrooms}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Square className="w-4 h-4" />
            <span className="text-sm font-medium">{area} m²</span>
          </div>
        </div>
      </div>
    </article>
  );
};

export default PropertyCard;
