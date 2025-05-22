import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUp, ArrowDown } from "lucide-react";

interface OrderItem {
  id: string;
  order_id: string;
  title: string;
  quantity: number;
  status: "en_attente" | "en_cours" | "reporte" | "annule" | "termine";
  current_step_index: number;
  item_notes?: string;
  product: {
    name: string;
    process_steps: string[];
  };
  clientName: string;
  order_date: string;
}

// Helper for status badge styling and text
const getStatusBadgeProps = (status: OrderItem["status"]) => {
  switch (status) {
    case "termine":
      return {
        variant: "default" as const,
        text: "Terminé",
        className: "bg-green-500 hover:bg-green-600 text-white",
      };
    case "reporte":
      return {
        variant: "secondary" as const,
        text: "Reporté",
        className: "text-gray-600 border-gray-400",
      };
    case "annule":
      return { variant: "destructive" as const, text: "Annulé" };
    case "en_attente":
      return {
        variant: "outline" as const,
        text: "En attente",
        className: "text-blue-500 border-blue-400",
      };
    case "en_cours":
      return {
        variant: "outline" as const,
        text: "En cours",
        className: "text-yellow-500 border-yellow-400",
      };
    default:
      const exhaustiveCheck: never = status;
      return {
        variant: "outline" as const,
        text: String(exhaustiveCheck).replace("_", " "),
        className: "text-gray-500",
      };
  }
};

const OrdersPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State for new filters
  const [productFilter, setProductFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [minQuantityFilter, setMinQuantityFilter] = useState("");
  const [maxQuantityFilter, setMaxQuantityFilter] = useState("");
  const [startDateFilter, setStartDateFilter] = useState<Date | undefined>(
    undefined
  );
  const [endDateFilter, setEndDateFilter] = useState<Date | undefined>(
    undefined
  );

  // State for table sorting
  const [sortConfigKey, setSortConfigKey] = useState<keyof OrderItem | null>(
    null
  );
  const [sortConfigDirection, setSortConfigDirection] = useState<
    "asc" | "desc"
  >("asc");

  // Generate unique lists for select dropdowns
  const uniqueProductTitles = React.useMemo(() => {
    const titles = new Set(orderItems.map((item) => item.title));
    return ["Tous les produits", ...Array.from(titles)];
  }, [orderItems]);

  const uniqueClientNames = React.useMemo(() => {
    const names = new Set(orderItems.map((item) => item.clientName));
    return ["Tous les clients", ...Array.from(names)];
  }, [orderItems]);

  useEffect(() => {
    fetchOrderItems();
  }, [navigate, toast]);

  const processedOrderItems = React.useMemo(() => {
    return orderItems.map((item) => ({
      ...item,
      // Ensure order_date is a valid Date object for comparison, or null if invalid
      parsed_order_date: item.order_date ? new Date(item.order_date) : null,
    }));
  }, [orderItems]);

  const filteredAndSortedOrderItems = React.useMemo(() => {
    let itemsToFilter = [...processedOrderItems];

    if (productFilter && productFilter !== "Tous les produits") {
      itemsToFilter = itemsToFilter.filter(
        (item) => item.title === productFilter
      );
    }

    if (clientFilter && clientFilter !== "Tous les clients") {
      itemsToFilter = itemsToFilter.filter(
        (item) => item.clientName === clientFilter
      );
    }

    if (minQuantityFilter) {
      const minQty = parseInt(minQuantityFilter, 10);
      if (!isNaN(minQty)) {
        itemsToFilter = itemsToFilter.filter((item) => item.quantity >= minQty);
      }
    }

    if (maxQuantityFilter) {
      const maxQty = parseInt(maxQuantityFilter, 10);
      if (!isNaN(maxQty)) {
        itemsToFilter = itemsToFilter.filter((item) => item.quantity <= maxQty);
      }
    }

    if (startDateFilter) {
      const startDate = new Date(startDateFilter.valueOf());
      startDate.setHours(0, 0, 0, 0);
      itemsToFilter = itemsToFilter.filter(
        (item) => item.parsed_order_date && item.parsed_order_date >= startDate
      );
    }

    if (endDateFilter) {
      const endDate = new Date(endDateFilter.valueOf());
      endDate.setHours(23, 59, 59, 999);
      itemsToFilter = itemsToFilter.filter(
        (item) => item.parsed_order_date && item.parsed_order_date <= endDate
      );
    }

    // Apply sorting
    if (sortConfigKey) {
      itemsToFilter.sort((a, b) => {
        // Prioritize "en_cours" status first
        if (a.status === "en_cours" && b.status !== "en_cours") return -1;
        if (a.status !== "en_cours" && b.status === "en_cours") return 1;

        // Then sort by the configured key and direction
        if (a[sortConfigKey] < b[sortConfigKey]) {
          return sortConfigDirection === "asc" ? -1 : 1;
        }
        if (a[sortConfigKey] > b[sortConfigKey]) {
          return sortConfigDirection === "asc" ? 1 : -1;
        }
        // If values are equal, fall back to date sort (or other tie-breakers)
        if (a.parsed_order_date && b.parsed_order_date) {
          return b.parsed_order_date.getTime() - a.parsed_order_date.getTime();
        }
        return 0;
      });
    } else {
      // Default sort (status priority, then date descending)
      itemsToFilter.sort((a, b) => {
        if (a.status === "en_cours" && b.status !== "en_cours") return -1;
        if (a.status !== "en_cours" && b.status === "en_cours") return 1;
        if (a.parsed_order_date && b.parsed_order_date) {
          return b.parsed_order_date.getTime() - a.parsed_order_date.getTime();
        }
        return 0;
      });
    }
    return itemsToFilter;
  }, [
    processedOrderItems,
    productFilter,
    clientFilter,
    minQuantityFilter,
    maxQuantityFilter,
    startDateFilter,
    endDateFilter,
    sortConfigKey,
    sortConfigDirection,
  ]);

  const requestSort = (key: keyof OrderItem) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfigKey === key && sortConfigDirection === "asc") {
      direction = "desc";
    }
    setSortConfigKey(key);
    setSortConfigDirection(direction);
  };

  const fetchOrderItems = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.from("order_items").select(
        `
          id,
          order_id, 
          quantity,
          status,
          current_step_index,
          item_notes,
          products:product_id (
            name,
            process_steps
          ),
          orders:order_id (
            id, 
            order_date,
            clients:client_id (
              full_name
            )
          )
        `
      );

      if (error) {
        console.error("Error fetching order items:", error);
        throw error;
      }

      if (!data) {
        setOrderItems([]);
        console.warn("No data returned from fetchOrderItems");
        return;
      }

      const transformedData = data.map((item: any) => ({
        id: item.id,
        order_id: item.orders.id,
        title: item.products?.name || "Produit inconnu",
        quantity: item.quantity,
        status: item.status || "en_attente",
        current_step_index: item.current_step_index || 0,
        item_notes: item.item_notes,
        product: item.products || {
          name: "Produit inconnu",
          process_steps: [],
        },
        clientName: item.orders?.clients?.full_name || "Client inconnu",
        order_date: item.orders.order_date,
      }));

      setOrderItems(transformedData);
    } catch (error) {
      console.error("Error fetching order items:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les commandes.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusCounts = () => {
    return {
      all: filteredAndSortedOrderItems.length,
      en_attente: filteredAndSortedOrderItems.filter(
        (item) => item.status === "en_attente"
      ).length,
      en_cours: filteredAndSortedOrderItems.filter(
        (item) => item.status === "en_cours"
      ).length,
      termine: filteredAndSortedOrderItems.filter(
        (item) => item.status === "termine"
      ).length,
      other: filteredAndSortedOrderItems.filter((item) =>
        ["reporte", "annule"].includes(item.status)
      ).length,
    };
  };

  const statusCounts = getStatusCounts();

  const renderTable = (items: OrderItem[]) => {
    if (items.length === 0) {
      return (
        <p className="text-center py-10 text-slate-500">
          Aucune commande à afficher pour ce statut.
        </p>
      );
    }
    return (
      <div className="rounded-md border mt-4 overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-100">
            <TableRow>
              <TableHead className="text-brandPrimary font-bold">
                Client
              </TableHead>
              <TableHead className="text-brandPrimary">Produit</TableHead>
              <TableHead
                className="text-right text-brandPrimary cursor-pointer hover:text-brandSecondary transition-colors"
                onClick={() => requestSort("quantity")}
              >
                Quantité
                {sortConfigKey === "quantity" && (
                  <span className="ml-1 inline-block">
                    {sortConfigDirection === "asc" ? (
                      <ArrowUp size={14} />
                    ) : (
                      <ArrowDown size={14} />
                    )}
                  </span>
                )}
              </TableHead>
              <TableHead className="text-brandPrimary">Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const badgeProps = getStatusBadgeProps(item.status);
              let displayText = badgeProps.text;

              if (item.status === "en_cours") {
                const stepIndex = item.current_step_index ?? 0;
                const steps = item.product?.process_steps;
                if (
                  steps &&
                  steps.length > 0 &&
                  stepIndex >= 0 &&
                  stepIndex < steps.length
                ) {
                  const currentStepName = steps[stepIndex];
                  if (currentStepName !== "Emballage") {
                    displayText = `En Cours - ${currentStepName}`;
                  } else {
                    displayText = "En Cours"; // Explicitly show "En Cours" if step is "Emballage"
                  }
                } else {
                  // Default to "En Cours" if steps are not defined or index is out of bounds
                  displayText = "En Cours";
                }
              }

              return (
                <TableRow
                  key={item.id}
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => navigate(`/orders/${item.order_id}`)}
                >
                  <TableCell>{item.clientName}</TableCell>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell>
                    <Badge
                      variant={badgeProps.variant}
                      className={badgeProps.className}
                    >
                      {displayText}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center h-[60vh] bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brandSecondary mx-auto"></div>
          <p className="mt-4 text-brandPrimary">Chargement des commandes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-xl sm:text-2xl font-bold mb-6">Commandes</h1>

      {/* Filter UI Elements */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 p-4 border rounded-md bg-slate-50">
        <div>
          <Label htmlFor="productFilter" className="text-sm font-medium">
            Produit
          </Label>
          <Select
            value={productFilter}
            onValueChange={(value) =>
              setProductFilter(value === "Tous les produits" ? "" : value)
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Tous les produits" />
            </SelectTrigger>
            <SelectContent>
              {uniqueProductTitles.map((title) => (
                <SelectItem key={title} value={title}>
                  {title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="clientFilter" className="text-sm font-medium">
            Client
          </Label>
          <Select
            value={clientFilter}
            onValueChange={(value) =>
              setClientFilter(value === "Tous les clients" ? "" : value)
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Tous les clients" />
            </SelectTrigger>
            <SelectContent>
              {uniqueClientNames.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="minQuantityFilter" className="text-sm font-medium">
              Qté Min
            </Label>
            <Input
              id="minQuantityFilter"
              type="number"
              placeholder="Min"
              value={minQuantityFilter}
              onChange={(e) => setMinQuantityFilter(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="maxQuantityFilter" className="text-sm font-medium">
              Qté Max
            </Label>
            <Input
              id="maxQuantityFilter"
              type="number"
              placeholder="Max"
              value={maxQuantityFilter}
              onChange={(e) => setMaxQuantityFilter(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="startDateFilter" className="text-sm font-medium">
            Date de début
          </Label>
          <DatePicker
            date={startDateFilter}
            setDate={setStartDateFilter}
            placeholder="Date de début"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="endDateFilter" className="text-sm font-medium">
            Date de fin
          </Label>
          <DatePicker
            date={endDateFilter}
            setDate={setEndDateFilter}
            placeholder="Date de fin"
            className="mt-1"
          />
        </div>
      </div>

      <Tabs defaultValue="all" className="mt-4">
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
            value="other"
            className="data-[state=active]:text-brandPrimary data-[state=active]:border-b-2 data-[state=active]:border-brandSecondary"
          >
            Autres ({statusCounts.other})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-0">
          {renderTable(filteredAndSortedOrderItems)}
        </TabsContent>

        <TabsContent value="en_attente" className="mt-0">
          {renderTable(
            filteredAndSortedOrderItems.filter(
              (item) => item.status === "en_attente"
            )
          )}
        </TabsContent>

        <TabsContent value="en_cours" className="mt-0">
          {renderTable(
            filteredAndSortedOrderItems.filter(
              (item) => item.status === "en_cours"
            )
          )}
        </TabsContent>

        <TabsContent value="termine" className="mt-0">
          {renderTable(
            filteredAndSortedOrderItems.filter(
              (item) => item.status === "termine"
            )
          )}
        </TabsContent>

        <TabsContent value="other" className="mt-0">
          {renderTable(
            filteredAndSortedOrderItems.filter((item) =>
              ["reporte", "annule"].includes(item.status)
            )
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OrdersPage;
