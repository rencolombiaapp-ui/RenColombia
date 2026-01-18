import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Search from "./pages/Search";
import Favorites from "./pages/Favorites";
import Publish from "./pages/Publish";
import PropertyDetail from "./pages/PropertyDetail";
import MyProperties from "./pages/MyProperties";
import Messages from "./pages/Messages";
import Compare from "./pages/Compare";
import Profile from "./pages/Profile";
import PublisherProfile from "./pages/PublisherProfile";
import Plans from "./pages/Plans";
import Checkout from "./pages/Checkout";
import CheckoutConfirm from "./pages/CheckoutConfirm";
import Prices from "./pages/Prices";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import DataTreatment from "./pages/DataTreatment";
import Help from "./pages/Help";
import ReportProblem from "./pages/ReportProblem";
import Insurance from "./pages/Insurance";
import PropertyIntentions from "./pages/PropertyIntentions";
import Contracts from "./pages/Contracts";
import ContractDetail from "./pages/ContractDetail";
import NotFound from "./pages/NotFound";
import ChatbotButton from "./components/chatbot/ChatbotButton";
import ErrorBoundary from "./components/ErrorBoundary";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/buscar" element={<Search />} />
            <Route
              path="/favoritos"
              element={
                <ProtectedRoute>
                  <Favorites />
                </ProtectedRoute>
              }
            />
            <Route
              path="/publicar"
              element={
                <ProtectedRoute>
                  <Publish />
                </ProtectedRoute>
              }
            />
            <Route path="/inmueble/:id" element={<PropertyDetail />} />
            <Route
              path="/mis-inmuebles"
              element={
                <ProtectedRoute>
                  <MyProperties />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mensajes"
              element={
                <ProtectedRoute>
                  <Messages />
                </ProtectedRoute>
              }
            />
            <Route
              path="/comparar"
              element={
                <ProtectedRoute>
                  <Compare />
                </ProtectedRoute>
              }
            />
            <Route
              path="/perfil"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route path="/publicador/:id" element={<PublisherProfile />} />
            <Route path="/planes" element={<Plans />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/checkout/confirm" element={<CheckoutConfirm />} />
            <Route path="/precios" element={<Prices />} />
            <Route path="/terminos" element={<Terms />} />
            <Route path="/privacidad" element={<Privacy />} />
            <Route path="/datos" element={<DataTreatment />} />
            <Route path="/ayuda" element={<Help />} />
            <Route path="/reportar-problema" element={<ReportProblem />} />
            <Route
              path="/seguros"
              element={
                <ProtectedRoute>
                  <Insurance />
                </ProtectedRoute>
              }
            />
                <Route
                  path="/intenciones"
                  element={
                    <ProtectedRoute>
                      <PropertyIntentions />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/contratos"
                  element={
                    <ProtectedRoute>
                      <Contracts />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/contratos/:id"
                  element={
                    <ProtectedRoute>
                      <ContractDetail />
                    </ProtectedRoute>
                  }
                />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
        </Routes>
        <ChatbotButton />
      </BrowserRouter>
    </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
