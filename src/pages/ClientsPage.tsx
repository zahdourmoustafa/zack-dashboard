import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Edit, Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSupabase } from "@/context/SupabaseContext";
import { useNavigate } from "react-router-dom";

// Define Client interface
interface Client {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  created_at?: string;
  updated_at?: string;
}

const ClientsPage = () => {
  const { toast } = useToast();
  const { supabase } = useSupabase();
  const [searchQuery, setSearchQuery] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const navigate = useNavigate();

  // Fetch clients from Supabase
  const fetchClients = async () => {
    if (!supabase) return;
    setIsLoadingPage(true);
    try {
      const { data, error } = await supabase.from("clients").select("*");

      if (error) throw error;

      const clientsData = (data || []).map((client) => ({
        ...client,
        email: client.email || null,
      })) as Client[];

      setClients(clientsData);
      setFilteredClients(clientsData);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les clients",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPage(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (supabase) {
      fetchClients();
    }
  }, [supabase]);

  // Filter clients based on search query
  useEffect(() => {
    const filtered = clients.filter(
      (client) =>
        client.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (client.email &&
          client.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    setFilteredClients(filtered);
  }, [searchQuery, clients]);

  const handleEditClient = (client: Client) => {
    navigate(`/clients/edit/${client.id}`);
  };

  const handleDeleteClient = async (clientId: string, clientName: string) => {
    if (!supabase) return;
    try {
      // Check for associated orders
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id")
        .eq("client_id", clientId)
        .limit(1);

      if (ordersError) throw ordersError;

      if (orders && orders.length > 0) {
        toast({
          title: "Suppression impossible",
          description: `Le client "${clientName}" est associé à des commandes et ne peut pas être supprimé.`,
          variant: "destructive",
        });
        return;
      }

      const { error: deleteError } = await supabase
        .from("clients")
        .delete()
        .eq("id", clientId);

      if (deleteError) throw deleteError;

      toast({
        title: "Client supprimé",
        description: `Le client "${clientName}" a été supprimé avec succès.`,
      });

      fetchClients(); // Refresh the list
    } catch (error: any) {
      console.error(
        `Error deleting client "${clientName}" (ID: ${clientId}):`,
        error
      );
      toast({
        title: "Erreur de suppression",
        description:
          error.message || `Impossible de supprimer le client "${clientName}".`,
        variant: "destructive",
      });
    }
  };

  const handleAddNewClient = () => {
    navigate("/clients/new");
  };

  if (isLoadingPage) {
    return (
      <div className="container mx-auto px-4 py-8 bg-white min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brandSecondary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 bg-white min-h-screen">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4 sm:gap-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-brandPrimary">
          Clients
        </h1>
        <Button
          onClick={handleAddNewClient}
          className="flex items-center gap-2 bg-brandSecondary hover:bg-yellow-400 text-brandPrimary font-semibold"
        >
          <Plus className="h-4 w-4" /> Nouveau Client
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="search"
            placeholder="Rechercher un client..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredClients.length === 0 ? (
          <div className="col-span-full text-center py-10 text-slate-500">
            Aucun client trouvé. Créez votre premier client !
          </div>
        ) : (
          filteredClients.map((client) => (
            <Card key={client.id} className="flex flex-col shadow-lg">
              <CardHeader>
                <CardTitle className="truncate text-brandPrimary">
                  {client.full_name}
                </CardTitle>
                <CardDescription className="text-sm text-slate-600 truncate">
                  {client.phone} {client.email && `• ${client.email}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                {/* Future content for client card, e.g., order history summary */}
                <p className="text-xs text-slate-400">
                  Informations additionnelles du client...
                </p>
              </CardContent>
              <CardFooter className="flex justify-between mt-auto pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditClient(client)}
                  className="border-brandPrimary text-brandPrimary hover:bg-brandPrimary hover:text-slate-50"
                >
                  <Edit className="h-4 w-4 mr-1" /> Modifier
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    handleDeleteClient(client.id, client.full_name)
                  }
                  className="bg-red-600 hover:bg-red-700 text-slate-50"
                >
                  <Trash className="h-4 w-4 mr-1" /> Supprimer
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ClientsPage;
