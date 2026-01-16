import { Component, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("=== ErrorBoundary caught an error ===");
    console.error("Error:", error);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Component stack:", errorInfo.componentStack);
    console.error("=====================================");
    
    // También mostrar en la página
    alert(`Error capturado: ${error.message}\n\nRevisa la consola para más detalles.`);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", backgroundColor: "#fff", padding: "50px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ maxWidth: "600px", backgroundColor: "#f5f5f5", borderRadius: "8px", border: "1px solid #ddd", padding: "30px", textAlign: "center" }}>
            <div style={{ marginBottom: "20px" }}>
              <AlertTriangle style={{ width: "48px", height: "48px", color: "#ef4444" }} />
            </div>
            <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "#000", marginBottom: "10px" }}>
              Algo salió mal
            </h1>
            <p style={{ color: "#666", marginBottom: "20px", fontSize: "14px" }}>
              {this.state.error?.message || "Ocurrió un error inesperado"}
            </p>
            <pre style={{ backgroundColor: "#000", color: "#0f0", padding: "10px", borderRadius: "4px", fontSize: "12px", textAlign: "left", overflow: "auto", maxHeight: "200px" }}>
              {this.state.error?.stack || "No hay stack trace disponible"}
            </pre>
            <Button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = "/";
              }}
              style={{ marginTop: "20px" }}
            >
              Volver al inicio
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
