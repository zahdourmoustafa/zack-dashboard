import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Edit, ArrowLeft } from "lucide-react";
import { formatDistance } from "date-fns";
import { fr } from "date-fns/locale";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Client {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  created_at: string;
}

interface Order {
  id: string;
  client_id: string;
  product_id?: string;
  quantity?: number;
  created_at: string;
  status: string;
  current_step_index: number;
  history?: any;
  notes?: string;
  order_date?: string;
  updated_at?: string;
}

interface Product {
  id: string;
  name: string;
  process_steps: string[];
}

const getStatusColor = (status: string) => {
  if (status === "en_cours") return "bg-blue-500 text-white";
  if (status === "termine") return "bg-green-500 text-white";
  if (status === "annule") return "bg-red-500 text-white";
  return "bg-gray-500 text-white";
};

const getStatusText = (status: string) => {
  if (status === "en_cours") return "En Cours";
  if (status === "termine") return "Terminé";
  if (status === "annule") return "Annulé";
  return status;
};

import ClientForm from "@/components/ClientForm";

const ClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [client, setClient] = useState<Client | null>(null);
  const [clientOrders, setClientOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      navigate("/clients");
      return;
    }

    const fetchClientData = async () => {
      setIsLoading(true);
      try {
        const { data: clientData, error: clientError } = await supabase
          .from("clients")
          .select("*")
          .eq("id", id)
          .single();

        if (clientError) throw clientError;
        if (!clientData) {
          toast({
            title: "Erreur",
            description: "Client non trouvé",
            variant: "destructive",
          });
          navigate("/clients");
          return;
        }
        setClient(clientData);

        const { data: ordersData, error: ordersError } = await supabase
          .from("orders")
          .select("*")
          .eq("client_id", id);

        if (ordersError) throw ordersError;
        setClientOrders(ordersData || []);

        if (ordersData && ordersData.length > 0) {
          const productIds = [
            ...new Set(
              ordersData
                .map((o) => (o as Order).product_id)
                .filter((id): id is string => !!id)
            ),
          ];
          const { data: productsData, error: productsError } = await supabase
            .from("products")
            .select("*")
            .in("id", productIds);

          if (productsError) throw productsError;
          setProducts(productsData || []);
        }
      } catch (error) {
        console.error("Error fetching client details:", error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les détails du client.",
          variant: "destructive",
        });
        navigate("/clients");
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientData();
  }, [id, navigate, toast]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Chargement des détails du client...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-red-500">Client non trouvé.</p>
        <Button
          onClick={() => navigate("/clients")}
          className="mt-4 mx-auto block"
        >
          Retour aux clients
        </Button>
      </div>
    );
  }

  const getProductName = (productId?: string) => {
    if (!productId) return "Produit non spécifié";
    const product = products.find((p) => p.id === productId);
    return product ? product.name : "Produit inconnu";
  };

  const getCurrentStep = (order: Order) => {
    if (!order.product_id) {
      return "Produit non spécifié";
    }
    const product = products.find((p) => p.id === order.product_id);
    if (
      !product ||
      !product.process_steps ||
      order.current_step_index >= product.process_steps.length
    ) {
      return "Terminé";
    }
    return product.process_steps[order.current_step_index];
  };

  const viewOrderDetail = (orderId: string) => {
    navigate(`/orders/${orderId}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        className="mb-6 flex items-center gap-1"
        onClick={() => navigate("/clients")}
      >
        <ArrowLeft className="h-4 w-4" /> Retour aux clients
      </Button>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 gap-4 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{client.full_name}</h1>
          <p className="text-muted-foreground">
            Client depuis{" "}
            {formatDistance(new Date(client.created_at), new Date(), {
              addSuffix: true,
              locale: fr,
            })}
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Edit className="h-4 w-4" /> Modifier
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier les Informations du Client</DialogTitle>
            </DialogHeader>
            <ClientForm
              client={client}
              onSuccess={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-10">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              <div className="flex flex-col space-y-1">
                <span className="font-medium">Email</span>
                <a
                  href={`mailto:${client.email}`}
                  className="text-blue-600 hover:underline"
                >
                  {client.email}
                </a>
              </div>
              <div className="flex flex-col space-y-1 mt-4">
                <span className="font-medium">Téléphone</span>
                <a
                  href={`tel:${client.phone}`}
                  className="text-blue-600 hover:underline"
                >
                  {client.phone}
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Commandes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientOrders.length}</div>
            <p className="text-xs text-muted-foreground">
              {clientOrders.filter((o) => o.status === "en_cours").length}{" "}
              commandes en cours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Produits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(clientOrders.map((o) => o.product_id)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              types de produits commandés
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-semibold">
              Historique des Commandes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clientOrders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    {/* <TableHead>Produit</TableHead> */}
                    {/* <TableHead>Qté</TableHead> */}
                    <TableHead>Date</TableHead>
                    <TableHead>Statut</TableHead>
                    {/* <TableHead>Étape</TableHead> */}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientOrders.map((order) => (
                    <TableRow
                      key={order.id}
                      onClick={() => viewOrderDetail(order.id)}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell className="font-medium truncate max-w-[100px] sm:max-w-[150px]">
                        #{order.id.substring(0, 8)}...
                      </TableCell>
                      {/* <TableCell>
                        {getProductName(order.product_id)}
                      </TableCell> */}
                      {/* <TableCell>{order.quantity ?? "N/A"}</TableCell> */}
                      <TableCell>
                        {order.order_date
                          ? formatDistance(
                              new Date(order.order_date),
                              new Date(),
                              { addSuffix: true, locale: fr }
                            )
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${getStatusColor(order.status)}`}
                        >
                          {getStatusText(order.status)}
                        </Badge>
                      </TableCell>
                      {/* <TableCell>{getCurrentStep(order)}</TableCell> */}
                      <TableCell className="text-right">
                        {/* Placeholder for actions */}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-10">
                Aucune commande trouvée pour ce client.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientDetail;
