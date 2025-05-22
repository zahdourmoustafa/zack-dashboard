import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import ClientForm from "@/components/ClientForm";
import { supabase } from "@/integrations/supabase/client";

interface Client {
  id: string;
  full_name: string;
  email: string;
  phone: string;
}

interface Order {
  id: string;
  client_id: string;
}

const ClientsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isAddClientDialogOpen, setIsAddClientDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchClientsAndOrders = async () => {
    setIsLoading(true);
    try {
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("*");

      if (clientsError) throw clientsError;
      setClients(clientsData || []);
      setFilteredClients(clientsData || []);

      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("id, client_id");

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClientsAndOrders();
  }, []);

  useEffect(() => {
    const filtered = clients.filter(
      (client) =>
        client.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.phone.includes(searchQuery)
    );
    setFilteredClients(filtered);
  }, [searchQuery, clients]);

  const getClientOrdersCount = (clientId: string) => {
    return orders.filter((order) => order.client_id === clientId).length;
  };

  const viewClientDetail = (clientId: string) => {
    navigate(`/clients/${clientId}`);
  };

  const handleClientAdded = async () => {
    setIsAddClientDialogOpen(false);
    await fetchClientsAndOrders();
    toast({
      title: "Client Ajouté",
      description: "Le nouveau client a été ajouté avec succès.",
    });
  };

  const openDeleteConfirmDialog = (client: Client) => {
    setClientToDelete(client);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;

    try {
      // First, delete all orders associated with this client
      const { error: ordersDeleteError } = await supabase
        .from("orders")
        .delete()
        .eq("client_id", clientToDelete.id);

      if (ordersDeleteError) {
        // If deleting orders fails, we should not proceed to delete the client.
        console.error("Error deleting associated orders:", ordersDeleteError);
        toast({
          title: "Erreur de Suppression des Commandes",
          description: `Impossible de supprimer les commandes associées au client ${clientToDelete.full_name}. Le client n'a pas été supprimé.`,
          variant: "destructive",
        });
        return; // Important: stop execution here
      }

      // If orders are successfully deleted (or there were none), proceed to delete the client
      const { error: clientDeleteError } = await supabase
        .from("clients")
        .delete()
        .eq("id", clientToDelete.id);

      if (clientDeleteError) throw clientDeleteError; // This will be caught by the outer catch block

      toast({
        title: "Client et Commandes Supprimés",
        description: `Le client ${clientToDelete.full_name} et toutes ses commandes associées ont été supprimés avec succès.`,
      });
      await fetchClientsAndOrders(); // Refresh the list
    } catch (error) {
      // This catch block will handle errors from deleting the client itself, or re-thrown errors.
      console.error("Error in deletion process:", error);
      toast({
        title: "Erreur de Suppression",
        description: `Une erreur est survenue lors de la suppression du client ${clientToDelete.full_name} ou de ses commandes.`,
        variant: "destructive",
      });
    } finally {
      setIsDeleteConfirmOpen(false);
      setClientToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center h-[60vh] bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brandSecondary mx-auto"></div>
          <p className="mt-4 text-brandPrimary">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 bg-white min-h-screen">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4 sm:gap-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-brandPrimary">
          Clients
        </h1>
        <Dialog
          open={isAddClientDialogOpen}
          onOpenChange={setIsAddClientDialogOpen}
        >
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2 bg-brandSecondary hover:bg-yellow-400 text-brandPrimary font-semibold">
              <Plus className="h-4 w-4" /> Nouveau Client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un Nouveau Client</DialogTitle>
              <DialogDescription>
                Remplissez les informations ci-dessous pour ajouter un nouveau
                client.
              </DialogDescription>
            </DialogHeader>
            <ClientForm onSuccess={handleClientAdded} />
          </DialogContent>
        </Dialog>
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

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-100">
            <TableRow>
              <TableHead className="text-brandPrimary">Nom Complet</TableHead>
              <TableHead className="text-brandPrimary">Téléphone</TableHead>
              <TableHead className="text-brandPrimary">Email</TableHead>
              <TableHead className="text-brandPrimary">Commandes</TableHead>
              <TableHead className="text-right text-brandPrimary">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-10 text-slate-500"
                >
                  Aucun client trouvé
                </TableCell>
              </TableRow>
            ) : (
              filteredClients.map((client) => (
                <TableRow key={client.id} className="hover:bg-slate-50">
                  <TableCell
                    className="font-medium cursor-pointer hover:text-brandSecondary hover:underline"
                    onClick={() => viewClientDetail(client.id)}
                  >
                    {client.full_name}
                  </TableCell>
                  <TableCell>{client.phone}</TableCell>
                  <TableCell>{client.email}</TableCell>
                  <TableCell>{getClientOrdersCount(client.id)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteConfirmDialog(client);
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {clientToDelete && (
        <Dialog
          open={isDeleteConfirmOpen}
          onOpenChange={setIsDeleteConfirmOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmer la Suppression</DialogTitle>
              <DialogDescription>
                Êtes-vous sûr de vouloir supprimer le client{" "}
                <strong>{clientToDelete.full_name}</strong>? Cette action est
                irréversible et supprimera également toutes les commandes
                associées à ce client.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => setIsDeleteConfirmOpen(false)}
              >
                Annuler
              </Button>
              <Button variant="destructive" onClick={handleDeleteClient}>
                Supprimer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ClientsPage;