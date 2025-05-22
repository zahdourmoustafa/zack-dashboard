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
import { Edit, ArrowLeft, Mail, Phone, ShoppingBag } from "lucide-react";
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
  updated_at?: string;
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

const ClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [client, setClient] = useState<Client | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchClientData = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);

      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*, products(id, name, process_steps)")
        .eq("client_id", id);

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);

      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id, name, process_steps");
      if (productsError) throw productsError;
      setProducts(productsData || []);
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

  useEffect(() => {
    if (!id) {
      navigate("/clients");
      return;
    }
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
      <div className="flex justify-between items-center mb-6">
        <Button onClick={() => navigate("/clients")} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour aux Clients
        </Button>
        <Button
          onClick={() => navigate(`/clients/edit/${client.id}`)}
          variant="default"
        >
          <Edit className="mr-2 h-4 w-4" /> Modifier le Client
        </Button>
      </div>

      <Card className="mb-8 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-brandPrimary">
            {client.full_name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center">
            <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>{client.email || "Non spécifié"}</span>
          </div>
          <div className="flex items-center">
            <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>{client.phone}</span>
          </div>
        </CardContent>
      </Card>

      <h2 className="text-xl font-semibold mb-4 text-brandPrimary">
        Commandes Récentes
      </h2>
      {orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card
              key={order.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => viewOrderDetail(order.id)}
            >
              <CardHeader>
                <CardTitle className="text-lg">
                  Commande #{order.id.substring(0, 8)}
                </CardTitle>
                <Badge
                  variant={order.status === "termine" ? "default" : "secondary"}
                >
                  {order.status}
                </Badge>
              </CardHeader>
              <CardContent>
                <p>
                  Date:{" "}
                  {order.order_date
                    ? new Date(order.order_date).toLocaleDateString()
                    : "N/A"}
                </p>
                {/* Additional order details can be shown here */}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p>Aucune commande trouvée pour ce client.</p>
      )}
    </div>
  );
};

export default ClientDetail;
