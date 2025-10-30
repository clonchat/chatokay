"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import Link from "next/link";
import { useAuthNavigation } from "@/hooks/use-auth-navigation";
import { useEffect } from "react";
import {
  Clock,
  MessageSquare,
  Calendar,
  Sparkles,
  Settings,
  Bot,
  CalendarCheck,
  Scissors,
  Stethoscope,
  Dumbbell,
  Briefcase,
  Sparkle,
  Users,
  CheckCircle2,
  LayoutDashboard,
  Globe,
  Plug,
  Mail,
  MessageCircle,
} from "lucide-react";
import Image from "next/image";
import { JsonLd } from "@/components/json-ld";
import { LandingChatbot } from "@/components/landing-chatbot";
import { LoadingScreen } from "@/components/loading";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://chatokay.com";

// Structured Data JSON-LD para SEO
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${baseUrl}#organization`,
      name: "ChatOkay",
      url: baseUrl,
      logo: `${baseUrl}/chatokay-logo.png`,
      description:
        "Asistente de citas con IA para negocios. Automatiza la gestión de citas con integraciones de Google Calendar, Telegram y WhatsApp.",
      contactPoint: {
        "@type": "ContactPoint",
        email: "chatokay.dev@gmail.com",
        contactType: "customer service",
        availableLanguage: ["Spanish"],
      },
      sameAs: [],
    },
    {
      "@type": "WebSite",
      "@id": `${baseUrl}#website`,
      url: baseUrl,
      name: "ChatOkay",
      description:
        "Asistente de citas con IA para negocios. Automatiza reservas y gestiona citas 24/7.",
      publisher: {
        "@id": `${baseUrl}#organization`,
      },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${baseUrl}/search?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${baseUrl}#software`,
      name: "ChatOkay",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      description:
        "Asistente de citas con IA que automatiza la gestión de reservas para negocios. Incluye integraciones con Google Calendar, Telegram y WhatsApp.",
      featureList: [
        "Asistente de IA 24/7",
        "Integración con Google Calendar",
        "Integración con Telegram y WhatsApp",
        "Subdominio personalizado",
        "Dashboard completo de gestión",
        "Automatización de citas",
      ],
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.8",
        ratingCount: "150",
      },
    },
  ],
};

export default function Page() {
  const { authStatus, redirectToCorrectPage } = useAuthNavigation();

  useEffect(() => {
    // Only redirect if user is authenticated or needs onboarding
    // Don't redirect unauthenticated users - let them see the landing page
    if (authStatus === "authenticated" || authStatus === "onboarding") {
      redirectToCorrectPage();
    }
  }, [authStatus, redirectToCorrectPage]);

  // If user is authenticated or needs onboarding, show loading while redirecting
  if (authStatus === "authenticated" || authStatus === "onboarding") {
    return <LoadingScreen message="Redirigiendo..." />;
  }

  // Otherwise (loading or unauthenticated), render the landing immediately

  // Show landing page immediately for unauthenticated users and while loading
  // This improves UX by not showing an unnecessary loading screen
  return (
    <>
      <JsonLd data={structuredData} />
      <LandingChatbot />
      <div className="min-h-svh bg-background">
        {/* Hero Section - Full Viewport */}
        <section className="relative flex items-center justify-center min-h-screen px-4 py-20 overflow-hidden">
          {/* Video Background */}
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="absolute top-0 left-0 w-full h-full object-cover z-0"
            style={{ objectFit: "cover", minHeight: "100%", minWidth: "100%" }}
          >
            <source
              src="https://videos.pexels.com/video-files/946147/946147-hd_1920_1080_30fps.mp4"
              type="video/mp4"
            />
            Tu navegador no soporta videos.
          </video>

          {/* Overlay for readability - muy sutil */}
          <div className="absolute inset-0 bg-white/70 z-[1]" />

          <div className="max-w-6xl mx-auto text-center space-y-12 relative z-10">
            {/* Logo */}
            <div className="flex justify-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <div className="relative">
                <Image
                  src="/chatokay-logo.png"
                  alt="ChatOkay Logo"
                  width={240}
                  height={240}
                  className="w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 drop-shadow-2xl"
                  priority
                />
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl -z-10 scale-150" />
              </div>
            </div>

            {/* Main Heading */}
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300">
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-light tracking-tight text-foreground drop-shadow-lg">
                Chat?{" "}
                <span className="font-semibold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent drop-shadow-lg">
                  Okay!
                </span>
              </h1>
              <p className="text-lg md:text-xl lg:text-2xl text-foreground/90 max-w-2xl mx-auto font-light leading-relaxed drop-shadow-md">
                Asistente de citas con IA para negocios
              </p>
            </div>

            {/* CTA Buttons - Glassmorphism */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
              <Link href="/sign-in">
                <Button
                  size="lg"
                  className="text-base cursor-pointer md:text-lg px-8 md:px-10 h-12 md:h-14 rounded-full bg-background/20 backdrop-blur-md border border-white/20 text-foreground hover:bg-background/30 hover:border-white/30 transition-all duration-300 shadow-xl"
                >
                  Iniciar Sesión
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button
                  size="lg"
                  className="text-base cursor-pointer md:text-lg px-8 md:px-10 h-12 md:h-14 rounded-full bg-background/20 backdrop-blur-md border border-white/20 text-foreground hover:bg-background/30 hover:border-white/30 transition-all duration-300 shadow-xl"
                >
                  Registrarse
                </Button>
              </Link>
            </div>

            {/* Scroll indicator */}
            <div className="absolute bottom-[-20vh] left-1/2 -translate-x-1/2 animate-bounce">
              <div className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex items-start justify-center p-2">
                <div className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section
          id="features"
          className="py-24 md:py-32 px-4 bg-gradient-to-b from-background to-muted/20"
        >
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20 space-y-4">
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-light tracking-tight mb-4">
                Todo lo que necesitas
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-light">
                Todo lo que necesitas para gestionar tus citas: dashboard
                completo, subdominio personalizado, integraciones automáticas y
                más
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-background/50 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-6">
                    <Bot className="w-7 h-7 text-primary" />
                  </div>
                  <CardTitle className="text-xl font-medium mb-2">
                    Asistente de IA
                  </CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    Tu asistente inteligente gestiona citas 24/7 con respuestas
                    naturales y precisas
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-background/50 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-6">
                    <LayoutDashboard className="w-7 h-7 text-primary" />
                  </div>
                  <CardTitle className="text-xl font-medium mb-2">
                    Dashboard Completo
                  </CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    Control total de tus citas con un panel intuitivo para
                    gestionar todo desde un solo lugar
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-background/50 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-6">
                    <Globe className="w-7 h-7 text-primary" />
                  </div>
                  <CardTitle className="text-xl font-medium mb-2">
                    Subdominio Personalizado
                  </CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    Obtén tu chat personalizado instantáneamente. Tu negocio, tu
                    marca, tu dominio
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-background/50 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-6">
                    <Calendar className="w-7 h-7 text-primary" />
                  </div>
                  <CardTitle className="text-xl font-medium mb-2">
                    Google Calendar
                  </CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    Sincronización automática con tu calendario. Evita
                    conflictos y duplicados
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-background/50 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-6">
                    <MessageCircle className="w-7 h-7 text-primary" />
                  </div>
                  <CardTitle className="text-xl font-medium mb-2">
                    Telegram & WhatsApp
                  </CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    Recibe y gestiona citas directamente desde tus canales de
                    Telegram y WhatsApp
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-background/50 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-6">
                    <Clock className="w-7 h-7 text-primary" />
                  </div>
                  <CardTitle className="text-xl font-medium mb-2">
                    Disponible 24/7
                  </CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    Tus clientes pueden agendar citas en cualquier momento,
                    incluso fuera de tu horario
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* Cómo Funciona Section */}
        <section className="py-24 md:py-32 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-20 space-y-4">
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-light tracking-tight mb-4">
                Cómo Funciona
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-light">
                En solo 3 pasos estarás recibiendo citas automáticamente
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-12">
              <div className="flex flex-col items-center text-center space-y-6 group">
                <div className="relative mb-4">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center text-4xl font-medium shadow-xl">
                    1
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-12 h-12 rounded-xl bg-background border-2 border-primary/20 flex items-center justify-center shadow-lg">
                    <Settings className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-medium">Configura tu negocio</h3>
                  <p className="text-muted-foreground leading-relaxed max-w-xs font-light">
                    Conecta Google Calendar, Telegram y WhatsApp. Personaliza
                    tus servicios y disponibilidad
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-center text-center space-y-6 group">
                <div className="relative mb-4">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center text-4xl font-medium shadow-xl">
                    2
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-12 h-12 rounded-xl bg-background border-2 border-primary/20 flex items-center justify-center shadow-lg">
                    <Globe className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-medium">
                    Subdominio instantáneo
                  </h3>
                  <p className="text-muted-foreground leading-relaxed max-w-xs font-light">
                    Obtén tu subdominio personalizado al instante. Tu chatbot ya
                    está listo para recibir clientes
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-center text-center space-y-6 group">
                <div className="relative mb-4">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center text-4xl font-medium shadow-xl">
                    3
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-12 h-12 rounded-xl bg-background border-2 border-primary/20 flex items-center justify-center shadow-lg">
                    <CalendarCheck className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-medium">Gestiona todo</h3>
                  <p className="text-muted-foreground leading-relaxed max-w-xs font-light">
                    Controla todas tus citas desde el dashboard. Las citas se
                    sincronizan automáticamente con tu calendario
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Casos de Uso Section */}
        <section className="py-24 md:py-32 px-4 bg-gradient-to-b from-muted/20 to-background">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-20 space-y-4">
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-light tracking-tight mb-4">
                Perfecto para tu negocio
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-light">
                ChatOkay se adapta a cualquier tipo de servicio con citas
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Badge
                variant="secondary"
                className="px-6 py-4 text-base h-auto flex items-center gap-3 rounded-full border-0 bg-muted/50 hover:bg-muted transition-colors duration-300 shadow-sm"
              >
                <Scissors className="w-5 h-5" />
                Salones de Belleza
              </Badge>
              <Badge
                variant="secondary"
                className="px-6 py-4 text-base h-auto flex items-center gap-3 rounded-full border-0 bg-muted/50 hover:bg-muted transition-colors duration-300 shadow-sm"
              >
                <Stethoscope className="w-5 h-5" />
                Clínicas Médicas
              </Badge>
              <Badge
                variant="secondary"
                className="px-6 py-4 text-base h-auto flex items-center gap-3 rounded-full border-0 bg-muted/50 hover:bg-muted transition-colors duration-300 shadow-sm"
              >
                <Dumbbell className="w-5 h-5" />
                Fitness & Entrenadores
              </Badge>
              <Badge
                variant="secondary"
                className="px-6 py-4 text-base h-auto flex items-center gap-3 rounded-full border-0 bg-muted/50 hover:bg-muted transition-colors duration-300 shadow-sm"
              >
                <Briefcase className="w-5 h-5" />
                Consultorías
              </Badge>
              <Badge
                variant="secondary"
                className="px-6 py-4 text-base h-auto flex items-center gap-3 rounded-full border-0 bg-muted/50 hover:bg-muted transition-colors duration-300 shadow-sm"
              >
                <Sparkle className="w-5 h-5" />
                Spas & Bienestar
              </Badge>
              <Badge
                variant="secondary"
                className="px-6 py-4 text-base h-auto flex items-center gap-3 rounded-full border-0 bg-muted/50 hover:bg-muted transition-colors duration-300 shadow-sm"
              >
                <Users className="w-5 h-5" />Y muchos más...
              </Badge>
            </div>
          </div>
        </section>

        {/* Testimonios/Social Proof Section */}
        <section className="py-24 md:py-32 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-20 space-y-4">
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-light tracking-tight mb-4">
                Confiado por negocios
              </h2>
              <div className="mt-12 mb-16">
                <p className="text-6xl md:text-7xl font-light text-primary mb-3 tracking-tight">
                  10,000+
                </p>
                <p className="text-lg md:text-xl text-muted-foreground font-light">
                  citas agendadas automáticamente
                </p>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-background/50 backdrop-blur-sm">
                <CardHeader>
                  <CardDescription className="text-base leading-relaxed">
                    "ChatOkay transformó nuestro negocio. Ahora recibimos citas
                    incluso cuando no estamos en el salón. Los clientes están
                    encantados con la facilidad."
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">María González</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Salón de Belleza Elegante
                  </p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-background/50 backdrop-blur-sm">
                <CardHeader>
                  <CardDescription className="text-base leading-relaxed">
                    "La integración con Google Calendar es perfecta. Ya no tengo
                    que preocuparme por conflictos de horarios. Todo funciona
                    automáticamente."
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">Dr. Carlos Ruiz</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Clínica Dental Sonrisa
                  </p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-background/50 backdrop-blur-sm">
                <CardHeader>
                  <CardDescription className="text-base leading-relaxed">
                    "Configuré todo en menos de 10 minutos. El chatbot entiende
                    perfectamente a mis clientes y agenda las citas sin
                    problemas. Recomendado 100%."
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">Ana Martínez</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Estudio de Yoga Zen
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <section className="relative py-24 md:py-32 px-4 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/95 to-primary/90" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
          <div className="max-w-4xl mx-auto text-center space-y-10 relative z-10">
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-light tracking-tight text-primary-foreground">
              ¿Listo para automatizar tus citas?
            </h2>
            <p className="text-lg md:text-xl text-primary-foreground/90 max-w-2xl mx-auto font-light">
              Únete a cientos de negocios que ya confían en ChatOkay para
              gestionar sus citas
            </p>
            <div className="space-y-4">
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="text-lg px-10 h-14 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300"
              >
                <Link href="/sign-up">Empezar gratis ahora</Link>
              </Button>
              <p className="text-sm text-primary-foreground/80 flex items-center justify-center gap-2 font-light">
                <CheckCircle2 className="w-4 h-4" />
                Sin tarjeta de crédito requerida
              </p>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-24 md:py-32 px-4 bg-gradient-to-b from-background to-muted/20">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-light tracking-tight">
              ¿Tienes preguntas?
            </h2>
            <p className="text-lg text-muted-foreground font-light">
              Contáctanos y te responderemos lo antes posible
            </p>
            <div className="flex items-center justify-center gap-3">
              <Mail className="w-5 h-5 text-primary" />
              <a
                href="mailto:chatokay.dev@gmail.com"
                className="text-lg font-medium text-foreground hover:text-primary transition-colors"
              >
                chatokay.dev@gmail.com
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t bg-background py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-3 gap-12 mb-12">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Image
                    src="/chatokay-logo.png"
                    alt="ChatOkay"
                    width={32}
                    height={32}
                    className="w-8 h-8"
                  />
                  <h3 className="text-2xl font-medium">ChatOkay</h3>
                </div>
                <p className="text-muted-foreground font-light leading-relaxed">
                  Tu asistente de citas con IA. Automatiza reservas y nunca más
                  pierdas una cita.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-6">Legal</h4>
                <ul className="space-y-3">
                  <li>
                    <Link
                      href="/terms"
                      className="text-muted-foreground hover:text-foreground transition-colors font-light"
                    >
                      Términos de Servicio
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/privacy"
                      className="text-muted-foreground hover:text-foreground transition-colors font-light"
                    >
                      Política de Privacidad
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-6">Cuenta</h4>
                <ul className="space-y-3">
                  <li>
                    <Link
                      href="/sign-in"
                      className="text-muted-foreground hover:text-foreground transition-colors font-light"
                    >
                      Iniciar Sesión
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/sign-up"
                      className="text-muted-foreground hover:text-foreground transition-colors font-light"
                    >
                      Registrarse
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className="border-t pt-8 text-center text-sm text-muted-foreground font-light">
              <p>
                © {new Date().getFullYear()} ChatOkay. Todos los derechos
                reservados.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
