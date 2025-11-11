"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { useAtom } from "jotai";
import { api } from "@workspace/backend/_generated/api";
import { businessAtom } from "@/lib/store/auth-atoms";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import toast from "react-hot-toast";
import type { Id } from "@workspace/backend/_generated/dataModel";
import {
  RotateCcw,
  CheckSquare,
  Square,
  Clock,
  Sun,
  Sunset,
  Moon,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [businessId, setBusinessId] = useState<Id<"businesses"> | null>(null);
  const router = useRouter();
  const [, setBusiness] = useAtom(businessAtom);

  // Query to get existing business
  const existingBusiness = useQuery(api.businesses.getCurrentUserBusiness);

  // Determine initial step based on existing business data
  useEffect(() => {
    if (existingBusiness !== undefined) {
      if (existingBusiness) {
        // Business exists, determine which step to start from
        setBusinessId(existingBusiness._id);

        // Pre-populate form data from existing business
        setName(existingBusiness.name);
        setDescription(existingBusiness.description || "");
        setSubdomain(existingBusiness.subdomain);

        // Pre-populate visual config if exists
        if (existingBusiness.visualConfig) {
          setTheme(existingBusiness.visualConfig.theme || "light");
          setWelcomeMessage(existingBusiness.visualConfig.welcomeMessage || "");
        }

        // Pre-populate services if exist
        if (existingBusiness.appointmentConfig?.services) {
          setServices(existingBusiness.appointmentConfig.services);
        }

        // Check what's missing to determine starting step
        const hasVisualConfig =
          existingBusiness.visualConfig?.logoUrl ||
          existingBusiness.visualConfig?.welcomeMessage;
        const hasServices =
          existingBusiness.appointmentConfig?.services?.length > 0;
        const hasAvailability = existingBusiness.availability?.length > 0;

        if (!hasVisualConfig) {
          setStep(2); // Start with visual config
        } else if (!hasServices) {
          setStep(3); // Start with services
        } else if (!hasAvailability) {
          setStep(4); // Start with availability
        } else {
          // Everything is configured, redirect to dashboard
          router.push("/dashboard");
        }
      } else {
        // No business exists, start from step 1
        setStep(1);
      }
    }
  }, [existingBusiness, router]);

  // Step 1: Create Business
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Step 2: Visual Configuration
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [welcomeMessage, setWelcomeMessage] = useState("");

  // Step 3: Services
  const [services, setServices] = useState<
    Array<{
      id: string;
      name: string;
      duration: number;
      price?: number;
    }>
  >([]);

  // Step 4: Availability - Calendar state
  const DAYS = [
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
    "Domingo",
  ];
  const TIME_SLOTS = useMemo(() => {
    const slots = [];
    for (let hour = 8; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        slots.push(time);
      }
    }
    return slots;
  }, []);

  // Matrix: [dayIndex][timeSlotIndex] = boolean
  const [selectedSlots, setSelectedSlots] = useState<boolean[][]>(() =>
    DAYS.map(() => TIME_SLOTS.map(() => false))
  );
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{
    dayIndex: number;
    slotIndex: number;
  } | null>(null);
  const [dragValue, setDragValue] = useState<boolean>(false);

  // Convert existing availability to calendar slots
  useEffect(() => {
    if (existingBusiness?.availability) {
      const newSlots = DAYS.map(() => TIME_SLOTS.map(() => false));

      existingBusiness.availability.forEach((dayAvailability) => {
        const dayIndex = DAYS.indexOf(dayAvailability.day);
        if (dayIndex !== -1) {
          dayAvailability.slots.forEach((slot) => {
            const startIndex = TIME_SLOTS.indexOf(slot.start);
            const endIndex = TIME_SLOTS.indexOf(slot.end);

            if (startIndex !== -1 && endIndex !== -1) {
              for (let i = startIndex; i < endIndex; i++) {
                if (newSlots[dayIndex]) {
                  newSlots[dayIndex][i] = true;
                }
              }
            }
          });
        }
      });

      setSelectedSlots(newSlots);
    }
  }, [existingBusiness?.availability]);

  const createBusiness = useMutation(api.businesses.create);
  const updateVisualConfig = useMutation(api.businesses.updateVisualConfig);
  const updateServices = useMutation(api.businesses.updateServices);
  const updateAvailability = useMutation(api.businesses.updateAvailability);
  const generateUploadUrl = useMutation(api.businesses.generateUploadUrl);

  const [isLoading, setIsLoading] = useState(false);

  // Show loading while checking for existing business
  if (existingBusiness === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-4xl">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <h2 className="text-lg font-semibold">Cargando...</h2>
              <p className="text-muted-foreground">
                Verificando configuración del negocio
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 1: Create Business (only if no business exists)
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !subdomain) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    // Don't create if business already exists
    if (existingBusiness) {
      toast.error("El negocio ya existe");
      return;
    }

    setIsLoading(true);
    try {
      const id = await createBusiness({
        name,
        description,
        subdomain,
        email: email || undefined,
        phone: phone || undefined,
      });
      setBusinessId(id);
      toast.success("Negocio creado exitosamente");
      setStep(2);
    } catch (error: any) {
      toast.error(error.message || "Error al crear el negocio");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Visual Configuration
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!businessId) return;

    setIsLoading(true);
    try {
      let logoUrl: Id<"_storage"> | undefined;

      // Upload logo if selected
      if (logoFile) {
        const uploadUrl = await generateUploadUrl();
        const uploadResult = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": logoFile.type },
          body: logoFile,
        });

        if (!uploadResult.ok) {
          throw new Error("Error al subir el logo");
        }

        const { storageId } = await uploadResult.json();
        logoUrl = storageId;
      }

      await updateVisualConfig({
        businessId,
        logoUrl,
        theme,
        welcomeMessage: welcomeMessage || undefined,
      });

      toast.success("Configuración visual guardada exitosamente");
      setStep(3);
    } catch (error: any) {
      toast.error(error.message || "Error al guardar configuración visual");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Services (Table)
  const addService = () => {
    setServices([
      ...services,
      {
        id: crypto.randomUUID(),
        name: "",
        duration: 30,
        price: 0,
      },
    ]);
  };

  const removeService = (id: string) => {
    setServices(services.filter((s) => s.id !== id));
  };

  const updateService = (id: string, field: string, value: any) => {
    setServices(
      services.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!businessId) return;

    // Validate services
    const validServices = services.filter((s) => s.name.trim() !== "");
    if (validServices.length === 0) {
      toast.error("Por favor añade al menos un servicio");
      return;
    }

    setIsLoading(true);
    try {
      await updateServices({ businessId, services: validServices });
      toast.success("Servicios configurados exitosamente");
      setStep(4);
    } catch (error: any) {
      toast.error(error.message || "Error al actualizar servicios");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 4: Availability (Calendar)
  const toggleSlot = (dayIndex: number, slotIndex: number, value?: boolean) => {
    const newSlots = selectedSlots.map((day, dIdx) =>
      dIdx === dayIndex
        ? day.map((slot, sIdx) =>
            sIdx === slotIndex ? (value !== undefined ? value : !slot) : slot
          )
        : day
    );
    setSelectedSlots(newSlots);
  };

  const handleSlotMouseDown = (dayIndex: number, slotIndex: number) => {
    setIsDragging(true);
    const currentValue = selectedSlots[dayIndex]?.[slotIndex] || false;
    setDragValue(!currentValue);
    setDragStart({ dayIndex, slotIndex });
    toggleSlot(dayIndex, slotIndex);
  };

  const handleSlotMouseEnter = (dayIndex: number, slotIndex: number) => {
    if (isDragging && dragStart) {
      const startDay = dragStart.dayIndex;
      const startSlot = dragStart.slotIndex;

      // Only allow dragging within the same day
      if (dayIndex === startDay) {
        const minSlot = Math.min(startSlot, slotIndex);
        const maxSlot = Math.max(startSlot, slotIndex);

        const newSlots = selectedSlots.map((day, dIdx) =>
          dIdx === dayIndex
            ? day.map((slot, sIdx) =>
                sIdx >= minSlot && sIdx <= maxSlot ? dragValue : slot
              )
            : day
        );
        setSelectedSlots(newSlots);
      }
    }
  };

  const handleSlotMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  // Set up global mouse up listener
  useEffect(() => {
    if (isDragging) {
      const handleUp = () => handleSlotMouseUp();
      window.addEventListener("mouseup", handleUp);
      return () => window.removeEventListener("mouseup", handleUp);
    }
  }, [isDragging]);

  const toggleDay = (dayIndex: number) => {
    const allSelected = selectedSlots[dayIndex]?.every((slot) => slot);
    const newSlots = selectedSlots.map((day, dIdx) =>
      dIdx === dayIndex ? day.map(() => !allSelected) : day
    );
    setSelectedSlots(newSlots);
  };

  // Quick action functions
  const setTimeRange = (
    dayIndex: number,
    startHour: number,
    endHour: number
  ) => {
    const startSlotIndex = TIME_SLOTS.findIndex((time) => {
      const [hour] = time.split(":").map(Number);
      return hour !== undefined && hour >= startHour;
    });
    const endSlotIndex = TIME_SLOTS.findIndex((time) => {
      const [hour] = time.split(":").map(Number);
      return hour !== undefined && hour >= endHour;
    });

    if (startSlotIndex !== -1) {
      const newSlots = selectedSlots.map((day, dIdx) =>
        dIdx === dayIndex
          ? day.map((slot, sIdx) =>
              sIdx >= startSlotIndex &&
              (endSlotIndex === -1 || sIdx < endSlotIndex)
                ? true
                : slot
            )
          : day
      );
      setSelectedSlots(newSlots);
    }
  };

  const clearDay = (dayIndex: number) => {
    const newSlots = selectedSlots.map((day, dIdx) =>
      dIdx === dayIndex ? day.map(() => false) : day
    );
    setSelectedSlots(newSlots);
  };

  const setAllDays = () => {
    const newSlots = selectedSlots.map(() => TIME_SLOTS.map(() => true));
    setSelectedSlots(newSlots);
  };

  const clearAllDays = () => {
    const newSlots = selectedSlots.map(() => TIME_SLOTS.map(() => false));
    setSelectedSlots(newSlots);
  };

  // Group time slots by period
  const morningSlots = TIME_SLOTS.filter((time) => {
    const [hour] = time.split(":").map(Number);
    return hour !== undefined && hour >= 8 && hour < 12;
  });
  const afternoonSlots = TIME_SLOTS.filter((time) => {
    const [hour] = time.split(":").map(Number);
    return hour !== undefined && hour >= 12 && hour < 18;
  });
  const eveningSlots = TIME_SLOTS.filter((time) => {
    const [hour] = time.split(":").map(Number);
    return hour !== undefined && hour >= 18;
  });

  const convertSlotsToAvailability = () => {
    const availability = DAYS.map((day, dayIndex) => {
      const daySlots = selectedSlots[dayIndex] || [];
      const slots: Array<{ start: string; end: string }> = [];

      let start: string | null = null;
      for (let i = 0; i < daySlots.length; i++) {
        if (daySlots[i] && start === null) {
          start = TIME_SLOTS[i] || "";
        } else if (!daySlots[i] && start !== null) {
          const end = TIME_SLOTS[i] || "";
          slots.push({ start, end });
          start = null;
        }
      }

      // If the last slot was selected, close it
      if (start !== null) {
        const lastTime = TIME_SLOTS[TIME_SLOTS.length - 1] || "";
        const [hours, minutes] = lastTime.split(":").map(Number);
        const endTime = `${(hours || 0).toString().padStart(2, "0")}:${((minutes || 0) + 30).toString().padStart(2, "0")}`;
        slots.push({ start, end: endTime });
      }

      return { day, slots };
    });

    return availability;
  };

  const handleStep4Submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!businessId) return;

    const availability = convertSlotsToAvailability();

    setIsLoading(true);
    try {
      await updateAvailability({ businessId, availability });
      toast.success("Disponibilidad configurada exitosamente");

      // Update the business atom with the new data
      setBusiness({
        _id: businessId,
        _creationTime: Date.now(),
        userId: "" as any,
        name,
        description,
        subdomain,
        visualConfig: {
          logoUrl: undefined,
          theme,
          welcomeMessage: welcomeMessage || undefined,
        },
        appointmentConfig: {
          services,
        },
        availability,
      });

      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Error al actualizar disponibilidad");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Configuración Inicial</CardTitle>
          <CardDescription>Paso {step} de 4</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step 1: Create Business */}
          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre del Negocio *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Mi Negocio"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe tu negocio..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="subdomain">Subdominio *</Label>
                <Input
                  id="subdomain"
                  value={subdomain}
                  onChange={(e) => {
                    // Solo permitir caracteres alfanuméricos y guiones
                    const value = e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, "");
                    setSubdomain(value);
                  }}
                  placeholder="minegocio"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tu chatbot estará en: {subdomain || "minegocio"}.chatokay.com
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Solo se permiten letras, números y guiones (-)
                </p>
              </div>
              <div>
                <Label htmlFor="email">Email de Contacto (Opcional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contacto@minegocio.com"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Los clientes podrán ver este email para contactarte
                </p>
              </div>
              <div>
                <Label htmlFor="phone">Número de Teléfono (Opcional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 234 567 8900"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Los clientes podrán ver este número para contactarte
                </p>
              </div>
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? "Creando..." : "Continuar"}
              </Button>
            </form>
          )}

          {/* Step 2: Visual Configuration */}
          {step === 2 && (
            <form onSubmit={handleStep2Submit} className="space-y-4">
              <div>
                <Label>Configuración Visual</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Personaliza la apariencia de tu chatbot
                </p>
              </div>

              <div>
                <Label htmlFor="logo">Logo del Negocio</Label>
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="cursor-pointer"
                />
                {logoPreview && (
                  <div className="mt-2">
                    <img
                      src={logoPreview}
                      alt="Vista previa del logo"
                      className="h-24 w-24 object-contain border rounded-lg p-2"
                    />
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Formatos aceptados: JPG, PNG, GIF (max 5MB)
                </p>
              </div>

              <div>
                <Label htmlFor="theme">Tema</Label>
                <select
                  id="theme"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as "light" | "dark")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="light">Claro</option>
                  <option value="dark">Oscuro</option>
                </select>
              </div>

              <div>
                <Label htmlFor="welcomeMessage">Mensaje de Bienvenida</Label>
                <Textarea
                  id="welcomeMessage"
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  placeholder="¡Hola! ¿En qué puedo ayudarte hoy?"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Este mensaje se mostrará cuando los usuarios abran el chat
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={isLoading}
                >
                  Atrás
                </Button>
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? "Guardando..." : "Continuar"}
                </Button>
              </div>
            </form>
          )}

          {/* Step 3: Services (Table) */}
          {step === 3 && (
            <form onSubmit={handleStep3Submit} className="space-y-4">
              <div>
                <Label>Servicios</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Añade los servicios que ofreces
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">
                        Nombre del Servicio
                      </th>
                      <th className="text-left p-2 font-medium w-32">
                        Duración (min)
                      </th>
                      <th className="text-left p-2 font-medium w-32">Precio</th>
                      <th className="text-left p-2 font-medium w-20">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="text-center p-4 text-muted-foreground"
                        >
                          No hay servicios. Haz clic en "+ Añadir Servicio" para
                          empezar.
                        </td>
                      </tr>
                    ) : (
                      services.map((service) => (
                        <tr
                          key={service.id}
                          className="border-b hover:bg-muted/50"
                        >
                          <td className="p-2">
                            <Input
                              placeholder="Nombre del servicio"
                              value={service.name}
                              onChange={(e) =>
                                updateService(
                                  service.id,
                                  "name",
                                  e.target.value
                                )
                              }
                              className="h-9"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              min="1"
                              value={service.duration}
                              onChange={(e) =>
                                updateService(
                                  service.id,
                                  "duration",
                                  parseInt(e.target.value) || 30
                                )
                              }
                              className="h-9"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={service.price || ""}
                              placeholder="Opcional"
                              onChange={(e) =>
                                updateService(
                                  service.id,
                                  "price",
                                  e.target.value
                                    ? parseFloat(e.target.value)
                                    : undefined
                                )
                              }
                              className="h-9"
                            />
                          </td>
                          <td className="p-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeService(service.id)}
                              className="h-9 w-9 p-0"
                            >
                              ✕
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={addService}
                className="w-full"
              >
                + Añadir Servicio
              </Button>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                  disabled={isLoading}
                >
                  Atrás
                </Button>
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? "Guardando..." : "Continuar"}
                </Button>
              </div>
            </form>
          )}

          {/* Step 4: Availability (Calendar) */}
          {step === 4 && (
            <form onSubmit={handleStep4Submit} className="space-y-4">
              <div>
                <Label>Disponibilidad Semanal</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Haz clic o arrastra para seleccionar horarios. Usa los botones
                  rápidos para configurar períodos comunes.
                </p>
              </div>

              {/* Global Actions */}
              <div className="bg-card rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Acciones rápidas:
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={setAllDays}
                    className="h-8"
                  >
                    <CheckSquare className="h-3 w-3 mr-1" />
                    Seleccionar todo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearAllDays}
                    className="h-8"
                  >
                    <Square className="h-3 w-3 mr-1" />
                    Limpiar todo
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                  <div className="grid grid-cols-8 gap-1 text-xs">
                    {/* Header row */}
                    <div className="p-2 font-medium"></div>
                    {DAYS.map((day, dayIndex) => (
                      <div
                        key={day}
                        className="p-2 font-medium text-center space-y-1"
                      >
                        <button
                          type="button"
                          onClick={() => toggleDay(dayIndex)}
                          className="text-xs font-semibold hover:text-primary transition-colors block w-full"
                        >
                          {day.substring(0, 3)}
                        </button>
                        <div className="flex flex-col gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] px-1"
                            onClick={() => setTimeRange(dayIndex, 8, 12)}
                            title="Mañana (8-12)"
                          >
                            <Sun className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] px-1"
                            onClick={() => setTimeRange(dayIndex, 12, 18)}
                            title="Tarde (12-18)"
                          >
                            <Sunset className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] px-1"
                            onClick={() => clearDay(dayIndex)}
                            title="Limpiar día"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {/* Morning section */}
                    {morningSlots.length > 0 && (
                      <>
                        <div className="col-span-8 py-2 border-t border-border">
                          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <Sun className="h-3 w-3" />
                            <span>Mañana</span>
                          </div>
                        </div>
                        {morningSlots.map((time) => {
                          const slotIndex = TIME_SLOTS.indexOf(time);
                          return (
                            <div key={time} className="contents">
                              <div className="p-2 text-right font-medium text-muted-foreground text-[10px]">
                                {time}
                              </div>
                              {DAYS.map((_, dayIndex) => (
                                <button
                                  key={`${dayIndex}-${slotIndex}`}
                                  type="button"
                                  onMouseDown={() =>
                                    handleSlotMouseDown(dayIndex, slotIndex)
                                  }
                                  onMouseEnter={() =>
                                    handleSlotMouseEnter(dayIndex, slotIndex)
                                  }
                                  className={cn(
                                    "h-6 border rounded transition-all cursor-pointer",
                                    selectedSlots[dayIndex]?.[slotIndex]
                                      ? "bg-primary text-primary-foreground hover:bg-primary/90 border-primary"
                                      : "bg-muted hover:bg-muted/70 border-border"
                                  )}
                                />
                              ))}
                            </div>
                          );
                        })}
                      </>
                    )}

                    {/* Afternoon section */}
                    {afternoonSlots.length > 0 && (
                      <>
                        <div className="col-span-8 py-2 border-t border-border">
                          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <Sunset className="h-3 w-3" />
                            <span>Tarde</span>
                          </div>
                        </div>
                        {afternoonSlots.map((time) => {
                          const slotIndex = TIME_SLOTS.indexOf(time);
                          return (
                            <div key={time} className="contents">
                              <div className="p-2 text-right font-medium text-muted-foreground text-[10px]">
                                {time}
                              </div>
                              {DAYS.map((_, dayIndex) => (
                                <button
                                  key={`${dayIndex}-${slotIndex}`}
                                  type="button"
                                  onMouseDown={() =>
                                    handleSlotMouseDown(dayIndex, slotIndex)
                                  }
                                  onMouseEnter={() =>
                                    handleSlotMouseEnter(dayIndex, slotIndex)
                                  }
                                  className={cn(
                                    "h-6 border rounded transition-all cursor-pointer",
                                    selectedSlots[dayIndex]?.[slotIndex]
                                      ? "bg-primary text-primary-foreground hover:bg-primary/90 border-primary"
                                      : "bg-muted hover:bg-muted/70 border-border"
                                  )}
                                />
                              ))}
                            </div>
                          );
                        })}
                      </>
                    )}

                    {/* Evening section */}
                    {eveningSlots.length > 0 && (
                      <>
                        <div className="col-span-8 py-2 border-t border-border">
                          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <Moon className="h-3 w-3" />
                            <span>Noche</span>
                          </div>
                        </div>
                        {eveningSlots.map((time) => {
                          const slotIndex = TIME_SLOTS.indexOf(time);
                          return (
                            <div key={time} className="contents">
                              <div className="p-2 text-right font-medium text-muted-foreground text-[10px]">
                                {time}
                              </div>
                              {DAYS.map((_, dayIndex) => (
                                <button
                                  key={`${dayIndex}-${slotIndex}`}
                                  type="button"
                                  onMouseDown={() =>
                                    handleSlotMouseDown(dayIndex, slotIndex)
                                  }
                                  onMouseEnter={() =>
                                    handleSlotMouseEnter(dayIndex, slotIndex)
                                  }
                                  className={cn(
                                    "h-6 border rounded transition-all cursor-pointer",
                                    selectedSlots[dayIndex]?.[slotIndex]
                                      ? "bg-primary text-primary-foreground hover:bg-primary/90 border-primary"
                                      : "bg-muted hover:bg-muted/70 border-border"
                                  )}
                                />
                              ))}
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Help text */}
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Consejos de uso
                </h3>
                <ul className="list-disc list-inside space-y-1.5 text-sm text-foreground/60">
                  <li>
                    <strong>Clic:</strong> Selecciona o deselecciona un horario
                    individual
                  </li>
                  <li>
                    <strong>Arrastrar:</strong> Mantén presionado y arrastra
                    para seleccionar múltiples horarios consecutivos
                  </li>
                  <li>
                    <strong>Iconos rápidos:</strong> Usa los botones de sol para
                    mañana/tarde, o el botón de limpiar para limpiar un día
                  </li>
                  <li>
                    <strong>Día completo:</strong> Haz clic en el nombre del día
                    para seleccionar/deseleccionar todo el día
                  </li>
                  <li>
                    Los bloques{" "}
                    <span className="inline-block w-3 h-3 bg-primary rounded"></span>{" "}
                    indican horarios disponibles
                  </li>
                </ul>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(3)}
                  disabled={isLoading}
                >
                  Atrás
                </Button>
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? "Finalizando..." : "Finalizar"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
