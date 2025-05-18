import { useState, Fragment } from "react";
import { useNavigate } from "react-router-dom";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Order,
  Client,
  Product,
  getStatusColor,
  getStatusText,
} from "@/lib/mock-data";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface OrderTableProps {
  orders: Order[];
  clients: Client[];
  products: Product[];
}

const OrderTable = ({ orders, clients, products }: OrderTableProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const sortedOrders = [...orders].sort((a, b) => {
    const statusPriority = {
      en_cours: 0,
      en_attente: 1,
      reporte: 2,
      annule: 3,
      termine: 4,
    };
    return (
      statusPriority[a.status as keyof typeof statusPriority] -
      statusPriority[b.status as keyof typeof statusPriority]
    );
  });

  const getCurrentStepDisplay = (order: Order) => {
    const productDetails =
      order.products || products.find((p) => p.id === order.product_id);

    if (!productDetails) {
      return order.status === "termine"
        ? "Terminé"
        : "Détails produit manquants";
    }

    if (
      !productDetails.process_steps ||
      productDetails.process_steps.length === 0
    ) {
      return order.status === "termine" ? "Terminé" : "Étapes non définies";
    }

    const currentStepIndex =
      typeof order.current_step_index === "number"
        ? order.current_step_index
        : -1;

    if (currentStepIndex >= productDetails.process_steps.length) {
      return "Terminé";
    }
    if (currentStepIndex < 0 && order.status === "en_attente") {
      return "Prêt à commencer";
    }
    if (currentStepIndex < 0) {
      return "Indéfini";
    }
    return productDetails.process_steps[currentStepIndex];
  };

  const viewOrderDetail = (orderId: string) => {
    navigate(`/orders/${orderId}`);
  };

  const changeOrderStatus = async (
    order: Order,
    newStatus: "en_attente" | "en_cours" | "reporte" | "annule" | "termine"
  ) => {
    try {
      setUpdatingOrderId(order.id);
      const oldStatus = order.status;
      const productForOrder =
        order.products || products.find((p) => p.id === order.product_id);

      let stepNameForHistory = "Action sur la commande";
      if (productForOrder) {
        const stepIndex =
          typeof order.current_step_index === "number"
            ? order.current_step_index
            : -1;
        if (
          newStatus === "termine" &&
          (!productForOrder.process_steps ||
            productForOrder.process_steps.length === 0)
        ) {
          stepNameForHistory = "Finalisé (sans étapes définies)";
        } else if (
          oldStatus === "en_attente" &&
          newStatus === "en_cours" &&
          (!productForOrder.process_steps ||
            productForOrder.process_steps.length === 0)
        ) {
          stepNameForHistory = "Traitement initié";
        } else if (
          productForOrder.process_steps &&
          productForOrder.process_steps.length > 0 &&
          stepIndex >= 0 &&
          stepIndex < productForOrder.process_steps.length
        ) {
          stepNameForHistory = productForOrder.process_steps[stepIndex];
        } else if (newStatus === "termine") {
          stepNameForHistory = "Finalisation";
        } else {
          stepNameForHistory = `Changement vers ${getStatusText(newStatus)}`;
        }
      } else {
        stepNameForHistory = `Changement vers ${getStatusText(
          newStatus
        )} (produit non spécifié)`;
      }

      const newHistoryEntry = {
        step: stepNameForHistory,
        status: newStatus,
        timestamp: new Date().toISOString(),
      };
      const orderHistory = Array.isArray(order.history) ? order.history : [];
      const updatedHistory = [...orderHistory, newHistoryEntry];

      const { data: updatedOrder, error } = await supabase
        .from("orders")
        .update({
          status: newStatus,
          history: updatedHistory,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Statut de la commande mis à jour",
        description: `La commande pour ${
          productForOrder?.name || order.product_id
        } est maintenant "${getStatusText(newStatus)}"`,
      });
      window.location.reload();
    } catch (error) {
      console.error("Error updating order status:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut de la commande",
        variant: "destructive",
      });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead>Produit</TableHead>
            <TableHead>Qté</TableHead>
            <TableHead>Date Commande</TableHead>
            <TableHead>Statut Commande</TableHead>
            <TableHead>Étape Commande</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedOrders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-10">
                Aucune commande trouvée
              </TableCell>
            </TableRow>
          ) : (
            sortedOrders.map((order) => {
              const orderStatus = order.status || "en_attente";
              const orderProduct =
                order.products ||
                products.find((p) => p.id === order.product_id);

              return (
                <TableRow
                  key={order.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => viewOrderDetail(order.id)}
                >
                  <TableCell>
                    {order.clients?.full_name ||
                      order.client_id ||
                      "Client inconnu"}
                  </TableCell>
                  <TableCell>
                    {orderProduct?.name ||
                      order.product_id ||
                      "Produit inconnu"}
                  </TableCell>
                  <TableCell>{order.quantity}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className="text-sm">
                      {order.order_date || order.created_at
                        ? format(
                            new Date(order.order_date || order.created_at),
                            "dd/MM/yyyy",
                            { locale: fr }
                          )
                        : "Date N/A"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`${getStatusColor(orderStatus)}`}
                    >
                      {getStatusText(orderStatus)}
                    </Badge>
                  </TableCell>
                  <TableCell>{getCurrentStepDisplay(order)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={updatingOrderId === order.id}
                        >
                          {updatingOrderId === order.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-primary"></div>
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => viewOrderDetail(order.id)}
                        >
                          Voir Détails Commande
                        </DropdownMenuItem>
                        {orderStatus !== "termine" &&
                          orderStatus !== "annule" && (
                            <>
                              {orderStatus !== "en_attente" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    changeOrderStatus(order, "en_attente")
                                  }
                                >
                                  Marquer En attente
                                </DropdownMenuItem>
                              )}
                              {orderStatus !== "en_cours" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    changeOrderStatus(order, "en_cours")
                                  }
                                >
                                  Marquer En cours
                                </DropdownMenuItem>
                              )}
                              {orderStatus !== "reporte" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    changeOrderStatus(order, "reporte")
                                  }
                                >
                                  Marquer Reporté
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() =>
                                  changeOrderStatus(order, "termine")
                                }
                              >
                                Marquer Terminé
                              </DropdownMenuItem>
                            </>
                          )}
                        {orderStatus !== "annule" &&
                          orderStatus !== "termine" && (
                            <DropdownMenuItem
                              onClick={() => changeOrderStatus(order, "annule")}
                            >
                              Marquer Annulé
                            </DropdownMenuItem>
                          )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default OrderTable;
