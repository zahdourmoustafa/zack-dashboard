import { useNavigate, useLocation } from "react-router-dom";
import ClientForm from "@/components/ClientForm";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const ClientFormPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const fromPath = location.state?.from || "/orders";

  const handleSuccess = (newClientId?: string) => {
    toast({
      title: "Client Ajouté",
      description: "Le nouveau client a été ajouté avec succès.",
    });
    navigate(fromPath, { state: { newClientId }, replace: true });
  };

  const handleCancel = () => {
    navigate(fromPath, { replace: true });
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
