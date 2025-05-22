import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";

// Define form validation schema
const clientSchema = z.object({
  full_name: z
    .string()
    .min(2, { message: "Le nom doit contenir au moins 2 caractères" }),
  phone: z
    .string()
    .min(8, { message: "Le numéro de téléphone doit être valide" }),
  email: z
    .string()
    .email({ message: "L'email doit être valide" })
    .optional()
    .or(z.literal("")),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface ClientFormProps {
  client?: {
    id: string;
    full_name: string;
    phone: string;
    email: string;
  };
  onSuccess: (newClientId?: string) => void;
  onCancel?: () => void;
}

const ClientForm = ({ client, onSuccess, onCancel }: ClientFormProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      full_name: client?.full_name || "",
      phone: client?.phone || "",
      email: client?.email || "",
    },
    mode: "onSubmit", // Only validate on submit
  });

  const onFormSubmit = async (data: ClientFormData) => {
    // Don't proceed if form is already submitting
    if (isSubmitting) return;

    setIsSubmitting(true);

    // Prepare base data for Supabase, ensuring email is always a string.
    const baseSubmissionData: {
      full_name: string;
      phone: string;
      email: string;
    } = {
      full_name: data.full_name,
      phone: data.phone,
      email: data.email || "", // Ensures email value is always a string (or empty string)
    };

    let createdClientId: string | undefined = undefined; // Declare createdClientId here

    try {
      if (client?.id) {
        // Update existing client
        const updatePayload = {
          ...baseSubmissionData,
          updated_at: new Date().toISOString(),
        };
        const { error } = await supabase
          .from("clients")
          .update(updatePayload)
          .eq("id", client.id);

        if (error) throw error;
      } else {
        // Add new client
        const insertPayload = {
          ...baseSubmissionData,
        };
        const { data: newClient, error } = await supabase
          .from("clients")
          .insert(insertPayload)
          .select("id")
          .single();

        if (error) throw error;
        createdClientId = newClient?.id; // Assign here, no new declaration
      }

      // Show success toast only after successful database operation
      toast({
        title: client ? "Client mis à jour" : "Client ajouté",
        description: `${data.full_name} a été ${
          client ? "mis à jour" : "ajouté"
        } avec succès.`,
      });

      // Clear form and call onSuccess only after successful operation
      form.reset();
      onSuccess(client ? undefined : createdClientId);
    } catch (error) {
      console.error("Error saving client:", error);
      toast({
        title: "Erreur",
        description:
          "Une erreur est survenue lors de l'enregistrement du client.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onFormSubmit)}
        className="space-y-4 overflow-y-auto max-h-[70vh] "
      >
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>Nom Complet</FormLabel>
              <FormControl>
                <Input placeholder="Entrez le nom complet" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>Téléphone</FormLabel>
              <FormControl>
                <Input placeholder="0777442914" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>Email (optionnel)</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="exemple@email.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end pt-4 gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
          )}
          <Button
            type="submit"
            disabled={isSubmitting || form.formState.isSubmitting}
            className="bg-brandSecondary hover:bg-yellow-400 text-brandPrimary font-semibold"
          >
            {isSubmitting
              ? "Enregistrement..."
              : client
              ? "Mettre à jour"
              : "Ajouter"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ClientForm;
