import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ClientForm from "@/components/ClientForm";
import { useSupabase } from "@/context/SupabaseContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

// Define the Client interface, similar to Product in ProductFormPage
interface Client {
  id: string;
  full_name: string;
  phone: string;
  email: string | null; // Adjusted to match ClientForm schema (optional email)
  created_at?: string;
  updated_at?: string;
}

const ClientFormPage = () => {
  const { id: clientId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { supabase } = useSupabase();
  const { toast } = useToast();
  const [client, setClient] = useState<Client | null | undefined>(undefined); // undefined for loading, null for new
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (clientId && supabase) {
      const fetchClient = async () => {
        setIsLoading(true);
        try {
          const { data, error } = await supabase
            .from("clients")
            .select("*")
            .eq("id", clientId)
            .single();

          if (error) throw error;
          if (data) {
            setClient({
              ...data,
              email: data.email || null, // Ensure email is null if empty/undefined from DB
            } as Client);
          } else {
            toast({
              title: "Erreur",
              description: "Client non trouvé.",
              variant: "destructive",
            });
            navigate("/clients"); // Redirect if client not found
          }
        } catch (error: any) {
          console.error("Error fetching client:", error);
          toast({
            title: "Erreur de chargement",
            description:
              error.message || "Impossible de charger les données du client.",
            variant: "destructive",
          });
          navigate("/clients");
        } finally {
          setIsLoading(false);
        }
      };
      fetchClient();
    } else if (!clientId) {
      setClient(null); // Explicitly set to null for new client
    }
  }, [clientId, supabase, navigate, toast]);

  const handleSuccess = () => {
    toast({
      title: clientId ? "Client mis à jour" : "Client créé",
      description: `Le client a été ${
        clientId ? "mis à jour" : "créé"
      } avec succès.`,
      variant: "default",
    });
    navigate("/clients"); // Navigate to the clients list page after success
  };

  const handleCancel = () => {
    navigate("/clients"); // Navigate to the clients list page on cancel
  };

  if (isLoading || client === undefined) {
    return (
      <div className="container mx-auto px-4 py-8 bg-white min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brandSecondary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 bg-white min-h-screen">
      <div className="mb-6">
        <Button variant="outline" onClick={() => navigate(-1)} className="mb-4">
          &larr; Retour
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold text-brandPrimary">
          {clientId ? "Modifier le Client" : "Créer un Nouveau Client"}
        </h1>
        {client && clientId && (
          <p className="text-slate-600">
            Modification du client : {client.full_name}
          </p>
        )}
      </div>
      <ClientForm
        client={client} // client can be null for new, or a Client object for edit
        onSuccess={handleSuccess}
        onCancel={handleCancel} // Pass the onCancel handler
      />
    </div>
  );
};

export default ClientFormPage;
