import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import ClientForm from "@/components/ClientForm";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Client {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  created_at?: string;
  updated_at?: string;
}

const ClientFormPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: clientId } = useParams<{ id: string }>();
  const { toast } = useToast();

  const [client, setClient] = useState<Client | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const isEditMode = Boolean(clientId);

  const fromPath =
    location.state?.from || (isEditMode ? `/clients/${clientId}` : "/clients");

  useEffect(() => {
    if (isEditMode && clientId) {
      setIsLoading(true);
      const fetchClient = async () => {
        try {
          const { data, error } = await supabase
            .from("clients")
            .select("*")
            .eq("id", clientId)
            .single();
          if (error) throw error;
          if (data) {
            setClient(data as Client);
          } else {
            toast({
              title: "Erreur",
              description: "Client non trouvé.",
              variant: "destructive",
            });
            navigate("/clients");
          }
        } catch (error) {
          console.error("Error fetching client:", error);
          toast({
            title: "Erreur de chargement",
            description: "Impossible de charger les données du client.",
            variant: "destructive",
          });
          navigate("/clients");
        } finally {
          setIsLoading(false);
        }
      };
      fetchClient();
    } else if (!isEditMode) {
      setClient(null);
    }
  }, [clientId, isEditMode, navigate, toast]);

  const handleSuccess = (updatedClientId?: string) => {
    const targetClientId = clientId || updatedClientId;
    toast({
      title: isEditMode ? "Client mis à jour" : "Client Ajouté",
      description: `Le client a été ${
        isEditMode ? "mis à jour" : "ajouté"
      } avec succès.`,
    });
    navigate(
      isEditMode && targetClientId ? `/clients/${targetClientId}` : fromPath,
      {
        state: { newClientId: !isEditMode ? updatedClientId : undefined },
        replace: true,
      }
    );
  };

  const handleCancel = () => {
    navigate(fromPath, { replace: true });
  };

  if (isLoading || client === undefined) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brandSecondary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 bg-white min-h-screen">
      <Button
        onClick={handleCancel}
        variant="outline"
        className="mb-6 bg-slate-800 text-slate-50 hover:bg-slate-700 px-3 py-1.5 text-sm rounded-md shadow-md"
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Retour
      </Button>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-brandPrimary mb-6">
          {isEditMode ? "Modifier le Client" : "Ajouter un Nouveau Client"}
        </h1>
        <ClientForm
          client={client}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
};

export default ClientFormPage;
