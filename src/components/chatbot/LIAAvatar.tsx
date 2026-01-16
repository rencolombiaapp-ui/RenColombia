import { cn } from "@/lib/utils";
import { User } from "lucide-react";

interface LIAAvatarProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const LIAAvatar = ({ size = "md", className }: LIAAvatarProps) => {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-6 h-6",
  };

  // URL de la imagen del avatar de LIA
  // La imagen debe estar en public/lia-avatar.png
  const avatarImageUrl = "/lia-avatar.png";

  return (
    <div
      className={cn(
        "rounded-full overflow-hidden",
        "flex items-center justify-center",
        "bg-gradient-to-br from-primary/20 to-primary/10",
        "border-2 border-primary/30",
        "shadow-md",
        sizeClasses[size],
        className
      )}
      aria-label="LIA - Asistente Inmobiliaria"
    >
      <img
        src={avatarImageUrl}
        alt="LIA - Asistente Inmobiliaria"
        className="w-full h-full object-cover"
        onError={(e) => {
          // Fallback a icono si la imagen no carga
          const target = e.target as HTMLImageElement;
          target.style.display = "none";
          const parent = target.parentElement;
          if (parent && !parent.querySelector("svg")) {
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("class", cn("text-primary", iconSizes[size]));
            svg.setAttribute("fill", "currentColor");
            svg.setAttribute("viewBox", "0 0 20 20");
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("fill-rule", "evenodd");
            path.setAttribute("d", "M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z");
            path.setAttribute("clip-rule", "evenodd");
            svg.appendChild(path);
            parent.appendChild(svg);
          }
        }}
      />
    </div>
  );
};

export default LIAAvatar;
