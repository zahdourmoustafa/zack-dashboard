import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Plus, Trash2, ClipboardPlus, PackagePlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import OrderTable from "@/components/OrderTable";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Import Dialog components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Import ProductForm
import ProductForm from "@/components/ProductForm";

// Type definitions
import { Client, Order, Product, OrderItem } from "@/lib/mock-data";

const Dashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

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
        // Fetch orders with related clients, and for each order, its order_items,
        // and for each order_item, its related product.
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
            is_priority,
            client_id,
            clients ( id, full_name, email, phone, created_at ),
            order_items ( id, product_id, quantity, item_notes, products (id, name, description, process_steps) )
          `
          )
          .order("created_at", { ascending: false });

        if (ordersError) throw ordersError;

        // Fetch all clients and products separately - this might still be useful for general UI elements
        // like total client count or if you need a general list of all products for filtering/searching elsewhere.
        // However, for the orders list itself, the data is now embedded.
        const { data: clientsData, error: clientsError } = await supabase
          .from("clients")
          .select("*");
        if (clientsError) throw clientsError;
        setClients(clientsData || []);

        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select("*");
        if (productsError) throw productsError;
        setProducts(productsData || []);

        // Cast to Order[] - ensure your Order type in mock-data.ts includes order_items: OrderItem[]
        // and OrderItem includes product?: Product.
        setOrders((ordersData as unknown as Order[]) || []);
        setFilteredOrders((ordersData as unknown as Order[]) || []);
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

  // Filter, hide old cancelled, and sort orders
  useEffect(() => {
    // If orders array is empty and we are not in a loading state,
    // it means there are definitively no orders to display.
    // Set filteredOrders to empty and exit.
    if (!isLoading && orders.length === 0) {
      setFilteredOrders([]);
      return;
    }

    // If we are still loading but happen to have an empty orders array (e.g., initial state before fetch completes),
    // starting with an empty tempFilteredOrders is correct.
    // If orders has data (even if stale while isLoading is true for a refresh), process it.
    let tempFilteredOrders = [...orders];

    // 1. Filter out "annule" orders older than 48 hours
    // These orders will be completely removed from the displayed list.
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    tempFilteredOrders = tempFilteredOrders.filter((order) => {
      if (order.status === "annule") {
        // Use updated_at if available (should reflect cancellation time),
        // otherwise fallback to created_at.
        const timestampString = order.updated_at || order.created_at;
        // If neither timestamp is available (highly unlikely for valid orders), treat as not displayable.
        if (!timestampString) return false;

        const orderTimestamp = new Date(timestampString);
        // If the timestamp is invalid, also treat as not displayable.
        if (isNaN(orderTimestamp.getTime())) return false;

        return orderTimestamp > fortyEightHoursAgo; // Keep if newer than 48 hours ago
      }
      return true; // Keep all non-"annule" orders at this stage
    });

    // 2. Filter by Search Query (Client name, Order ID, or product names within order_items)
    // This applies to the orders that have passed the 48-hour "annule" filter.
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      tempFilteredOrders = tempFilteredOrders.filter((order) => {
        const clientName = order.clients?.full_name?.toLowerCase() || "";
        const hasMatchingProduct = order.order_items?.some((item) =>
          item.product?.name?.toLowerCase().includes(searchLower)
        );
        // Ensure boolean value is returned
        return (
          clientName.includes(searchLower) ||
          hasMatchingProduct ||
          order.id.toString().includes(searchLower)
        );
      });
    }

    // 3. Sort orders:
    // - Priority orders come first.
    // - Then, "annule" orders (<48h old) are moved to the bottom of their priority group.
    // - Within each group (priority/non-priority, non-annule/annule), orders are sorted by status, then creation date (descending).
    tempFilteredOrders.sort((a, b) => {
      // Primary sort: is_priority (true comes before false)
      if (a.is_priority && !b.is_priority) return -1;
      if (!a.is_priority && b.is_priority) return 1;

      // Secondary sort: "annule" status (non-annule comes before annule)
      const aIsCancelled = a.status === "annule";
      const bIsCancelled = b.status === "annule";
      if (aIsCancelled && !bIsCancelled) return 1;
      if (!aIsCancelled && bIsCancelled) return -1;

      // Tertiary sort: status order (en_cours, en_attente, reporte, termine)
      // (annule is already handled, termine will naturally be at the end of non-annule)
      const statusPriority = {
        en_cours: 0,
        en_attente: 1,
        reporte: 2,
        termine: 3, // This is for within non-cancelled items
        annule: 4, // This ensures cancelled items are last if not already separated
      };
      const priorityA =
        statusPriority[a.status as keyof typeof statusPriority] ?? 99;
      const priorityB =
        statusPriority[b.status as keyof typeof statusPriority] ?? 99;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Quaternary sort: creation date (newer first)
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (isNaN(timeA) && isNaN(timeB)) return 0;
      if (isNaN(timeA)) return 1;
      if (isNaN(timeB)) return -1;
      return timeB - timeA;
    });

    setFilteredOrders(tempFilteredOrders);
  }, [searchQuery, orders, isLoading]);

  // Calculate status counts
  useEffect(() => {
    const counts = {
      all: filteredOrders.length,
      en_attente: filteredOrders.filter((o) => o.status === "en_attente")
        .length,
      en_cours: filteredOrders.filter((o) => o.status === "en_cours").length,
      termine: filteredOrders.filter((o) => o.status === "termine").length,
      reporte: filteredOrders.filter((o) => o.status === "reporte").length,
      annule: filteredOrders.filter(
        (o) => o.status === "annule" && o.id !== undefined
      ).length, // ensure id exists if used for keying
    };

    setStatusCounts(counts);
  }, [filteredOrders]);

  const handleCreateOrder = () => {
    navigate("/orders/create");
  };

  const handleCreateProduct = () => {
    setSelectedProduct(null); // Ensure form is for a new product
    setIsProductFormOpen(true);
  };

  const handleProductFormSuccess = () => {
    setIsProductFormOpen(false);
    setSelectedProduct(null); // Clear selected product after success
    // Optionally, refresh products list if displayed on dashboard, though not strictly needed for just opening the form
    // For now, just show a success toast, ProductForm itself handles the actual data submission toast.
    // toast({ title: "Succès", description: "Opération produit réussie." });
    // ProductForm will show its own more specific toast.
  };

  const handleTogglePriority = async (
    orderId: string,
    currentPriority: boolean
  ) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .update({
          is_priority: !currentPriority,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .select(
          `
          id,
          order_date,
          status,
          notes,            
          created_at,
          updated_at,
          current_step_index,
          is_priority,
          client_id,
          clients ( id, full_name, email, phone, created_at ),
          order_items ( id, product_id, quantity, item_notes, products (id, name, description, process_steps) )
        `
        )
        .single();

      if (error) throw error;

      if (data) {
        const updatedOrder = data as unknown as Order;
        setOrders((prevOrders) =>
          prevOrders.map((o) => (o.id === orderId ? updatedOrder : o))
        );
        // No need to call setFilteredOrders here as the useEffect for sorting will pick it up
        toast({
          title: "Priorité Modifiée",
          description: `La priorité de la commande #${orderId} a été ${
            !currentPriority ? "ajoutée" : "retirée"
          }.`,
        });
      }
    } catch (error) {
      console.error("Error toggling priority:", error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier la priorité.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle cloning an order
  const handleCloneOrder = async (orderId: string) => {
    setIsLoading(true);
    try {
      // 1. Fetch the original order with all its details
      const { data: originalOrderData, error: fetchError } = await supabase
        .from("orders")
        .select(
          `
          *,
          clients ( * ),
          order_items ( *, products ( * ) )
        `
        )
        .eq("id", orderId)
        .single();

      if (fetchError) throw fetchError;
      if (!originalOrderData) {
        toast({
          title: "Erreur",
          description: "Commande originale non trouvée.",
          variant: "destructive",
        });
        return;
      }

      const originalOrder = originalOrderData as unknown as Order;

      // 2. Prepare the new order object
      const newOrderData = {
        client_id: originalOrder.client_id,
        order_date: new Date().toISOString(),
        status: "en_attente" as Order["status"],
        notes: `Clone de la commande #${originalOrder.id}${
          originalOrder.notes ? " - " + originalOrder.notes : ""
        }`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        current_step_index: 0,
        // Initialize history for the cloned order
        history: [
          {
            step: "Commande créée (clone)",
            status: "en_attente",
            timestamp: new Date().toISOString(),
          },
        ],
        // We don't copy 'id', 'shipping_details_id', 'payment_details_id' directly
        // as they are auto-generated or might need specific handling if you use them.
      };

      // 3. Insert the new order into the 'orders' table
      const { data: newOrderInsertResult, error: insertOrderError } =
        await supabase
          .from("orders")
          .insert({
            ...newOrderData,
            is_priority: originalOrder.is_priority || false,
          })
          .select(
            `
            id,
            order_date,
            status,
            notes,            
            created_at,
            updated_at,
            current_step_index,
            is_priority,
            client_id,
            clients ( id, full_name, email, phone, created_at ),
            order_items ( id, product_id, quantity, item_notes, products (id, name, description, process_steps) )
            `
          )
          .single();

      if (insertOrderError) throw insertOrderError;
      if (!newOrderInsertResult) {
        toast({
          title: "Erreur",
          description: "Impossible de créer la nouvelle commande clonée.",
          variant: "destructive",
        });
        return;
      }

      const newOrder = newOrderInsertResult as unknown as Order;

      // 4. Prepare and insert new order items
      if (originalOrder.order_items && originalOrder.order_items.length > 0) {
        const newOrderItemsData = originalOrder.order_items.map(
          (item: OrderItem) => ({
            order_id: newOrder.id,
            product_id: item.product_id,
            quantity: item.quantity,
            item_notes: item.item_notes,
            // Ensure other necessary fields for order_items are included,
            // or rely on database defaults if applicable.
          })
        );

        const { error: insertItemsError } = await supabase
          .from("order_items")
          .insert(newOrderItemsData);

        if (insertItemsError) {
          // Attempt to clean up the already created order if items fail
          await supabase.from("orders").delete().eq("id", newOrder.id);
          throw insertItemsError;
        }
        // Re-fetch the new order with its items for the UI state
        const { data: newOrderWithItems, error: newOrderFetchError } =
          await supabase
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
            client_id,
            clients ( id, full_name, email, phone, created_at ),
            order_items ( id, product_id, quantity, item_notes, products (id, name, description, process_steps) )
          `
            )
            .eq("id", newOrder.id)
            .single();

        if (newOrderFetchError) throw newOrderFetchError;
        if (newOrderWithItems) {
          setOrders((prevOrders) => [
            newOrderWithItems as unknown as Order,
            ...prevOrders,
          ]);
        }
      } else {
        // If there were no items, the newOrder object is already complete
        setOrders((prevOrders) => [newOrder, ...prevOrders]);
      }

      toast({
        title: "Commande Clonée",
        description: `La commande #${originalOrder.id} a été clonée avec succès en tant que commande #${newOrder.id}.`,
      });
    } catch (error) {
      console.error("Error cloning order:", error);
      toast({
        title: "Erreur de Clonage",
        description: `Impossible de cloner la commande. ${
          error instanceof Error ? error.message : ""
        }`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to open the confirmation dialog
  const handleClearTermineOrders = () => {
    if (statusCounts.termine > 0) {
      setIsClearConfirmOpen(true);
    } else {
      toast({
        title: "Aucune commande à effacer",
        description: "Il n'y a pas de commandes terminées à supprimer.",
      });
    }
  };

  // Function to delete all "terminé" orders
  const confirmClearTermineOrders = async () => {
    setIsClearConfirmOpen(false);
    const ordersToClear = orders.filter((order) => order.status === "termine");
    if (ordersToClear.length === 0) {
      toast({
        title: "Aucune commande à effacer",
        description: "Il n'y a pas de commandes terminées à supprimer.",
      });
      return;
    }

    const orderIdsToClear = ordersToClear.map((order) => order.id);

    try {
      setIsLoading(true); // Optional: show loading state during deletion
      const { error } = await supabase
        .from("orders")
        .delete()
        .in("id", orderIdsToClear);

      if (error) {
        // Check for foreign key constraint error (e.g., order_items referencing these orders)
        if (error.code === "23503") {
          toast({
            title: "Suppression Impossible",
            description:
              "Certaines commandes terminées n'ont pas pu être supprimées car elles ont des éléments associés (ex: articles de commande). Veuillez vérifier et réessayer.",
            variant: "destructive",
            duration: 7000,
          });
        } else {
          throw error;
        }
      } else {
        // Successfully deleted, now update local state
        const remainingOrders = orders.filter(
          (order) => !orderIdsToClear.includes(order.id)
        );
        setOrders(remainingOrders);
        setFilteredOrders(remainingOrders); // Also update filtered orders

        toast({
          title: "Commandes Terminées Effacées",
          description: `${orderIdsToClear.length} commande(s) terminée(s) ont été supprimée(s).`,
        });
      }
    } catch (error) {
      console.error("Error clearing terminé orders:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer les commandes terminées.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false); // Optional: hide loading state
    }
  };

  if (isLoading && orders.length === 0) {
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
    <div className="container mx-auto px-4 py-8 bg-white min-h-screen">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4 sm:gap-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-brandPrimary">
          Tableau de Bord
        </h1>
        <Button
          onClick={handleCreateOrder}
          className="hidden sm:flex items-center gap-2 bg-brandSecondary hover:bg-yellow-400 text-brandPrimary font-semibold"
        >
          <Plus className="h-4 w-4" /> Nouvelle Commande
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Card className="shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-brandPrimary">
              Total Commandes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-black">
              {statusCounts.all}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-lg hidden sm:block">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-500">
              En Attente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {statusCounts.en_attente}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-lg hidden sm:block">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">
              En Cours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {statusCounts.en_cours}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile-only quick actions section */}
      <div className="sm:hidden mb-8 space-y-5">
        <div className="flex space-x-3">
          <Card className="shadow-lg flex-1">
            <CardHeader className="pb-1 pt-3">
              <CardTitle className="text-xs font-medium text-orange-500 text-center">
                En Attente
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-xl font-bold text-orange-500 text-center">
                {statusCounts.en_attente}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-lg flex-1">
            <CardHeader className="pb-1 pt-3">
              <CardTitle className="text-xs font-medium text-blue-600 text-center">
                En Cours
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-xl font-bold text-blue-600 text-center">
                {statusCounts.en_cours}
              </div>
            </CardContent>
          </Card>
        </div>

        <h2 className="text-lg font-semibold text-gray-700 pt-2">
          Création rapide
        </h2>

        <div className="flex space-x-3">
          {/* Commande Button */}
          <div
            className="flex-1 bg-brandSecondary hover:bg-yellow-400 text-brandPrimary font-semibold px-4 py-2 rounded-lg shadow-sm flex items-center justify-center gap-2 cursor-pointer h-[50px] max-w-[180px] group"
            onClick={handleCreateOrder}
          >
            <ClipboardPlus className="h-5 w-5" />
            <span className="text-sm">commande</span>
          </div>

          {/* Produit Button */}
          <div
            className="flex-1 bg-brandSecondary hover:bg-yellow-400 text-brandPrimary font-semibold px-4 py-2 rounded-lg shadow-sm flex items-center justify-center gap-2 cursor-pointer h-[50px] max-w-[180px] group"
            onClick={handleCreateProduct}
          >
            <PackagePlus className="h-5 w-5" />
            <span className="text-sm">produit</span>
          </div>
        </div>
      </div>

      <div className="mb-6 flex items-center">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="search"
            placeholder="Rechercher par client ou produit..."
            className="pl-8 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="all" className="mt-0">
        <TabsList>
          <TabsTrigger
            value="all"
            className="data-[state=active]:text-brandPrimary data-[state=active]:border-b-2 data-[state=active]:border-brandSecondary"
          >
            Toutes ({statusCounts.all})
          </TabsTrigger>
          <TabsTrigger
            value="en_attente"
            className="data-[state=active]:text-brandPrimary data-[state=active]:border-b-2 data-[state=active]:border-brandSecondary"
          >
            En Attente ({statusCounts.en_attente})
          </TabsTrigger>
          <TabsTrigger
            value="en_cours"
            className="data-[state=active]:text-brandPrimary data-[state=active]:border-b-2 data-[state=active]:border-brandSecondary"
          >
            En Cours ({statusCounts.en_cours})
          </TabsTrigger>
          <TabsTrigger
            value="termine"
            className="data-[state=active]:text-brandPrimary data-[state=active]:border-b-2 data-[state=active]:border-brandSecondary"
          >
            Terminé ({statusCounts.termine})
          </TabsTrigger>
          <TabsTrigger
            value="reporte"
            className="data-[state=active]:text-brandPrimary data-[state=active]:border-b-2 data-[state=active]:border-brandSecondary"
          >
            Reporté ({statusCounts.reporte})
          </TabsTrigger>
          <TabsTrigger
            value="annule"
            className="data-[state=active]:text-brandPrimary data-[state=active]:border-b-2 data-[state=active]:border-brandSecondary"
          >
            Annulé ({statusCounts.annule})
          </TabsTrigger>
        </TabsList>

        <div className="flex justify-end mt-4 mb-4">
          <Button
            variant="outline"
            onClick={handleClearTermineOrders}
            className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
            disabled={statusCounts.termine === 0 || isLoading}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Effacer Terminées ({statusCounts.termine})
          </Button>
        </div>

        <TabsContent value="all">
          <OrderTable
            orders={filteredOrders}
            clients={clients}
            onCloneOrder={handleCloneOrder}
            onTogglePriority={handleTogglePriority}
          />
        </TabsContent>

        <TabsContent value="en_attente">
          <OrderTable
            orders={filteredOrders.filter((o) => o.status === "en_attente")}
            clients={clients}
            onCloneOrder={handleCloneOrder}
            onTogglePriority={handleTogglePriority}
          />
        </TabsContent>

        <TabsContent value="en_cours">
          <OrderTable
            orders={filteredOrders.filter((o) => o.status === "en_cours")}
            clients={clients}
            onCloneOrder={handleCloneOrder}
            onTogglePriority={handleTogglePriority}
          />
        </TabsContent>

        <TabsContent value="termine">
          <OrderTable
            orders={filteredOrders.filter((o) => o.status === "termine")}
            clients={clients}
            onCloneOrder={handleCloneOrder}
            onTogglePriority={handleTogglePriority}
          />
        </TabsContent>

        <TabsContent value="reporte">
          <OrderTable
            orders={filteredOrders.filter((o) => o.status === "reporte")}
            clients={clients}
            isLoading={isLoading}
            onCloneOrder={handleCloneOrder}
            onTogglePriority={handleTogglePriority}
          />
        </TabsContent>

        <TabsContent value="annule">
          <OrderTable
            orders={filteredOrders.filter((o) => o.status === "annule")}
            clients={clients}
            isLoading={isLoading}
            onCloneOrder={handleCloneOrder}
            onTogglePriority={handleTogglePriority}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={isClearConfirmOpen} onOpenChange={setIsClearConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer toutes les commandes terminées
              ({statusCounts.termine})? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsClearConfirmOpen(false)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={confirmClearTermineOrders}
              disabled={isLoading}
            >
              {isLoading ? "Suppression..." : "Oui, supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Product Dialog */}
      <Dialog open={isProductFormOpen} onOpenChange={setIsProductFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedProduct ? "Modifier le Produit" : "Ajouter un Produit"}
            </DialogTitle>
          </DialogHeader>
          <ProductForm
            product={selectedProduct}
            onSuccess={handleProductFormSuccess}
            onCancel={() => setIsProductFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
