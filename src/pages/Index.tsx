import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import OrderTable from "@/components/OrderTable";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Type definitions
import { Client, Order, Product } from "@/lib/mock-data";

const Dashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [statusCounts, setStatusCounts] = useState({
    all: 0,
    en_attente: 0,
    en_cours: 0,
    termine: 0,
    reporte: 0,
    annule: 0,
  });

  // Fetch data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch orders with related clients, order_items, and products for each item
        const { data: ordersData, error: ordersError } = await supabase
          .from("orders")
          .select(
            `
            id,
            order_date,
            status,
            notes,
            created_at,
            updated_at,
            current_step_index,
            quantity,
            client_id,
            product_id,
            clients ( id, full_name, email, phone ),
            products ( id, name, description, process_steps )
          `
          )
          .order("created_at", { ascending: false });

        if (ordersError) throw ordersError;

        // The shape of ordersData is now different.
        // We don't need to fetch clients and products separately if they are well-embedded.
        // However, keeping the separate fetches for `clients` and `products` for now
        // might be useful for other parts of the UI (e.g. total clients count, product search filters if they search ALL products)
        // and to minimize immediate refactoring. Let's refine this if necessary.

        const { data: clientsData, error: clientsError } = await supabase
          .from("clients")
          .select("*");
        if (clientsError) throw clientsError;
        setClients(clientsData || []);

        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select("*");
        if (productsError) throw productsError;
        setProducts(productsData || []); // This general products list might still be useful for search filters

        setOrders((ordersData as Order[]) || []);
        setFilteredOrders((ordersData as Order[]) || []); // Initial filter set
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

    fetchData();
  }, [toast]);

  // Filter orders based on search query
  useEffect(() => {
    if (orders.length === 0 && !isLoading) return;

    let tempFilteredOrders = [...orders];

    // 1. Filter by Search Query (Client name, Product name in items, Order ID)
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      tempFilteredOrders = tempFilteredOrders.filter((order) => {
        const clientName = order.clients?.full_name?.toLowerCase() || "";
        const productName = order.products?.name?.toLowerCase() || "";
        return (
          clientName.includes(searchLower) ||
          productName.includes(searchLower) ||
          order.id.toString().includes(searchLower)
        );
      });
    }

    setFilteredOrders(tempFilteredOrders);
  }, [searchQuery, orders, isLoading]); // Removed clients and products from deps as they are in order objects now for filtering purposes

  // Calculate status counts
  useEffect(() => {
    if (orders.length === 0) return;

    const counts = {
      all: orders.length,
      en_attente: orders.filter((o) => o.status === "en_attente").length,
      en_cours: orders.filter((o) => o.status === "en_cours").length,
      termine: orders.filter((o) => o.status === "termine").length,
      reporte: orders.filter((o) => o.status === "reporte").length,
      annule: orders.filter((o) => o.status === "annule").length,
    };

    setStatusCounts(counts);
  }, [orders]);

  const handleCreateOrder = () => {
    navigate("/orders/new");
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Tableau de Bord</h1>
        <Button onClick={handleCreateOrder} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Nouvelle Commande
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Commandes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.all}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">En Attente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.en_attente}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">En Cours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.en_cours}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Terminé</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.termine}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 flex items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="search"
            placeholder="Rechercher par client ou produit..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="all" className="mt-0">
        <TabsList>
          <TabsTrigger value="all">Toutes ({statusCounts.all})</TabsTrigger>
          <TabsTrigger value="en_attente">
            En Attente ({statusCounts.en_attente})
          </TabsTrigger>
          <TabsTrigger value="en_cours">
            En Cours ({statusCounts.en_cours})
          </TabsTrigger>
          <TabsTrigger value="termine">
            Terminé ({statusCounts.termine})
          </TabsTrigger>
          <TabsTrigger value="other">
            Reporté / Annulé ({statusCounts.reporte + statusCounts.annule})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <OrderTable
            orders={filteredOrders}
            clients={clients}
            products={products}
          />
        </TabsContent>

        <TabsContent value="en_attente">
          <OrderTable
            orders={filteredOrders.filter((o) => o.status === "en_attente")}
            clients={clients}
            products={products}
          />
        </TabsContent>

        <TabsContent value="en_cours">
          <OrderTable
            orders={filteredOrders.filter((o) => o.status === "en_cours")}
            clients={clients}
            products={products}
          />
        </TabsContent>

        <TabsContent value="termine">
          <OrderTable
            orders={filteredOrders.filter((o) => o.status === "termine")}
            clients={clients}
            products={products}
          />
        </TabsContent>

        <TabsContent value="other">
          <OrderTable
            orders={filteredOrders.filter(
              (o) => o.status === "reporte" || o.status === "annule"
            )}
            clients={clients}
            products={products}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
