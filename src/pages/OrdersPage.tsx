import { useState, useEffect } from "react";
import OrderTable from "@/components/OrderTable";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Client, Order, Product } from "@/lib/mock-data"; // Assuming types are here or adjust import
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";

// IMPORTS COPIED FROM Index.tsx for filters
import { Input } from "@/components/ui/input"; // For search input
import { Search, Calendar as CalendarIcon } from "lucide-react"; // For search and date picker icons
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { fr } from "date-fns/locale"; // for date formatting
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const OrdersPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // FILTER STATES COPIED FROM Index.tsx
  const [selectedProductId, setSelectedProductId] = useState<string>("all");
  const [selectedStep, setSelectedStep] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] =
    useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  // States for dropdown options COPIED FROM Index.tsx
  const [productOptions, setProductOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [stepOptions, setStepOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [statusOptions, setStatusOptions] = useState<
    { value: string; label: string }[]
  >([
    { value: "all", label: "Tous les statuts" },
    { value: "en_attente", label: "En Attente" },
    { value: "en_cours", label: "En Cours" },
    { value: "termine", label: "Terminé" },
    { value: "reporte", label: "Reporté" },
    { value: "annule", label: "Annulé" },
  ]);

  const handleCreateOrder = () => {
    navigate("/orders/new");
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
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
        // Populate product options - COPIED FROM Index.tsx
        setProductOptions([
          { value: "all", label: "Tous les produits" },
          ...(productsData || []).map((p) => ({ value: p.id, label: p.name })),
        ]);
        // Populate step options - COPIED FROM Index.tsx
        const allSteps = new Set<string>();
        (productsData || []).forEach((p) => {
          (p.process_steps || []).forEach((step) => allSteps.add(step));
        });
        setStepOptions([
          { value: "all", label: "Toutes les étapes" },
          ...Array.from(allSteps).map((step) => ({ value: step, label: step })),
        ]);

        const { data: ordersData, error: ordersError } = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false });
        if (ordersError) throw ordersError;
        setOrders(ordersData || []);
        setFilteredOrders(ordersData || []);
      } catch (error) {
        console.error("Error fetching data for orders page:", error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les commandes",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  // ADVANCED FILTERING LOGIC COPIED FROM Index.tsx
  useEffect(() => {
    if (orders.length === 0 && !isLoading) return;

    let tempFilteredOrders = [...orders];

    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      tempFilteredOrders = tempFilteredOrders.filter((order) => {
        const client = clients.find((c) => c.id === order.client_id);
        const productData = products.find((p) => p.id === order.product_id);
        return (
          client?.full_name.toLowerCase().includes(searchLower) ||
          productData?.name.toLowerCase().includes(searchLower) ||
          order.id.toString().includes(searchLower)
        );
      });
    }

    if (selectedProductId !== "all") {
      tempFilteredOrders = tempFilteredOrders.filter(
        (order) => order.product_id === selectedProductId
      );
    }

    if (selectedStatusFilter !== "all") {
      tempFilteredOrders = tempFilteredOrders.filter(
        (order) => order.status === selectedStatusFilter
      );
    }

    if (selectedStep !== "all") {
      tempFilteredOrders = tempFilteredOrders.filter((order) => {
        const productData = products.find((p) => p.id === order.product_id);
        if (
          productData &&
          productData.process_steps &&
          order.current_step_index < productData.process_steps.length
        ) {
          return (
            productData.process_steps[order.current_step_index] === selectedStep
          );
        }
        if (selectedStep === "Terminé" && order.status === "termine")
          return true;
        return false;
      });
    }

    if (dateFrom) {
      tempFilteredOrders = tempFilteredOrders.filter(
        (order) => new Date(order.created_at) >= dateFrom
      );
    }
    if (dateTo) {
      const inclusiveDateTo = new Date(dateTo);
      inclusiveDateTo.setDate(inclusiveDateTo.getDate() + 1);
      tempFilteredOrders = tempFilteredOrders.filter(
        (order) => new Date(order.created_at) < inclusiveDateTo
      );
    }

    setFilteredOrders(tempFilteredOrders);
  }, [
    searchQuery,
    orders,
    clients,
    products,
    selectedProductId,
    selectedStep,
    selectedStatusFilter,
    dateFrom,
    dateTo,
    isLoading,
  ]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Chargement des commandes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Liste des Commandes</h1>
        <Button onClick={handleCreateOrder} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Nouvelle Commande
        </Button>
      </div>

      {/* SEARCH BAR AND FILTERS UI COPIED FROM Index.tsx */}
      <div className="mb-6 flex flex-col gap-4">
        {" "}
        {/* Main container for search and filters */}
        <div className="relative max-w-sm">
          {" "}
          {/* Search Bar */}
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="search"
            placeholder="Rechercher par client, produit, ID..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-end">
          {" "}
          {/* Filters Grid */}
          {/* Product Filter */}
          <div>
            <label
              htmlFor="product-filter"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Produit
            </label>
            <Select
              value={selectedProductId}
              onValueChange={setSelectedProductId}
            >
              <SelectTrigger id="product-filter">
                <SelectValue placeholder="Sélectionner un produit" />
              </SelectTrigger>
              <SelectContent>
                {productOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Step Filter */}
          <div>
            <label
              htmlFor="step-filter"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Étape
            </label>
            <Select value={selectedStep} onValueChange={setSelectedStep}>
              <SelectTrigger id="step-filter">
                <SelectValue placeholder="Sélectionner une étape" />
              </SelectTrigger>
              <SelectContent>
                {stepOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Status Filter Dropdown */}
          <div>
            <label
              htmlFor="status-filter-dropdown"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Statut
            </label>
            <Select
              value={selectedStatusFilter}
              onValueChange={setSelectedStatusFilter}
            >
              <SelectTrigger id="status-filter-dropdown">
                <SelectValue placeholder="Sélectionner un statut" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Date From Filter */}
          <div>
            <label
              htmlFor="date-from"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Date (De)
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date-from"
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? (
                    format(dateFrom, "PPP", { locale: fr })
                  ) : (
                    <span>Choisir une date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          {/* Date To Filter */}
          <div>
            <label
              htmlFor="date-to"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Date (À)
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date-to"
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? (
                    format(dateTo, "PPP", { locale: fr })
                  ) : (
                    <span>Choisir une date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  initialFocus
                  disabled={(date) => (dateFrom ? date < dateFrom : false)}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <OrderTable
        orders={filteredOrders}
        clients={clients}
        products={products}
      />
    </div>
  );
};

export default OrdersPage;
