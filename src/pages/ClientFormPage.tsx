import { useNavigate } from "react-router-dom";
import ClientForm from "@/components/ClientForm";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const ClientFormPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSuccess = (newClientId?: string) => {
    toast({
      title: "Client Ajouté",
      description: "Le nouveau client a été ajouté avec succès.",
    });
    // Navigate back to the previous page, potentially with the new client's ID
    // If newClientId is provided, it can be passed in state for the previous page to use
    navigate(-1, { state: { newClientId } });
  };

  const handleCancel = () => {
    navigate(-1); // Go back to the previous page
  };

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
          Ajouter un Nouveau Client
        </h1>
        <ClientForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </div>
  );
};

export default ClientFormPage;
