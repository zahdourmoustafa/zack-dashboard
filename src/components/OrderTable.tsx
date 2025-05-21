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
import { ChevronDown, CopyIcon, StarIcon } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Order,
  Client,
  getStatusColor,
  getStatusText,
  OrderHistoryEntry,
} from "@/lib/mock-data";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Predefined palette of Tailwind classes for step badges
const stepColorPalette = [
  { bg: "bg-sky-100", text: "text-sky-700", border: "border-sky-300" },
  { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300" },
  {
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    border: "border-emerald-300",
  },
  { bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-300" },
  { bg: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-300" },
  { bg: "bg-pink-100", text: "text-pink-700", border: "border-pink-300" },
  { bg: "bg-lime-100", text: "text-lime-700", border: "border-lime-300" },
  { bg: "bg-cyan-100", text: "text-cyan-700", border: "border-cyan-300" },
];

// Map to store assigned colors for step names
const stepColorMap = new Map<
  string,
  { bg: string; text: string; border: string }
>();
let nextColorIndex = 0;

const getStepColorClass = (stepName: string): string => {
  if (!stepColorMap.has(stepName)) {
    const color = stepColorPalette[nextColorIndex % stepColorPalette.length];
    stepColorMap.set(stepName, color);
    nextColorIndex++;
  }
  const assignedColor = stepColorMap.get(stepName)!;
  return `${assignedColor.bg} ${assignedColor.text} ${assignedColor.border}`;
};

interface OrderTableProps {
  orders: Order[];
  clients: Client[];
  isLoading?: boolean;
  onCloneOrder: (orderId: string) => void;
  onTogglePriority: (orderId: string, currentPriority: boolean) => void;
}

const OrderTable = ({
  orders,
  clients,
  isLoading,
  onCloneOrder,
  onTogglePriority,
}: OrderTableProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const getCurrentStepNameForHistory = (order: Order): string => {
    if (order.status === "termine") return "Finalisé";
    if (order.status === "en_attente" && order.current_step_index === 0)
      return "Prêt à commencer";
    return `Étape ${order.current_step_index || 0}`;
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

      let stepNameForHistory = `Changement vers ${getStatusText(newStatus)}`;
      if (newStatus === "termine") {
        stepNameForHistory = "Finalisation de la commande";
      } else if (oldStatus === "en_attente" && newStatus === "en_cours") {
        stepNameForHistory = "Démarrage du traitement de la commande";
      } else if (
        order.current_step_index !== null &&
        order.order_items &&
        order.order_items.length > 0
      ) {
        const firstItem = order.order_items[0];
        if (
          firstItem &&
          firstItem.product &&
          firstItem.product.process_steps &&
          order.current_step_index < firstItem.product.process_steps.length
        ) {
          // stepNameForHistory = firstItem.product.process_steps[order.current_step_index];
        }
      }

      const newHistoryEntry: OrderHistoryEntry = {
        step: stepNameForHistory,
        status: newStatus,
        timestamp: new Date().toISOString(),
      };
      const orderHistory = Array.isArray(order.history) ? order.history : [];
      const updatedHistory = [...orderHistory, newHistoryEntry];

      const { error } = await supabase
        .from("orders")
        .update({
          status: newStatus,
          history: updatedHistory as any,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (error) throw error;

      toast({
        title: "Statut de la commande mis à jour",
        description: `La commande #${order.id} est maintenant "${getStatusText(
          newStatus
        )}"`,
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
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader className="bg-slate-100">
          <TableRow>
            <TableHead className="text-brandPrimary">Client</TableHead>
            <TableHead className="text-brandPrimary">Date Commande</TableHead>
            <TableHead className="text-brandPrimary">Âge Commande</TableHead>
            <TableHead className="text-brandPrimary">Statut Commande</TableHead>
            <TableHead className="text-brandPrimary text-center">
              Action
            </TableHead>
            <TableHead className="text-brandPrimary"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center py-10 text-slate-500"
              >
                Chargement des commandes...
              </TableCell>
            </TableRow>
          ) : orders.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center py-10 text-slate-500"
              >
                Aucune commande trouvée
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order) => {
              const orderStatus = order.status || "en_attente";
              const client = clients.find((c) => c.id === order.client_id);
              let clientName =
                client?.full_name || order.client_id || "Client inconnu";

              return (
                <TableRow
                  key={order.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => viewOrderDetail(order.id)}
                >
                  <TableCell className="font-medium hover:text-brandSecondary">
                    {order.is_priority && (
                      <StarIcon className="h-4 w-4 text-yellow-400 inline-block mr-1 mb-0.5" fill="yellow" />
                    )}
                    {clientName}
                  </TableCell>
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
                  <TableCell className="whitespace-nowrap">
                    <span className="text-sm">
                      {order.created_at
                        ? formatDistanceToNow(new Date(order.created_at), {
                            addSuffix: true,
                            locale: fr,
                          })
                        : "N/A"}
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
                  <TableCell className="text-center">
                    {orderStatus === "en_attente" && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          changeOrderStatus(order, "en_cours");
                        }}
                        size="sm"
                        className="bg-green-500 hover:bg-green-600 text-white font-semibold px-3 py-1 text-xs"
                        disabled={updatingOrderId === order.id}
                      >
                        {updatingOrderId === order.id ? (
                          <div className="h-3 w-3 animate-spin rounded-full border-b-2 border-white mx-auto"></div>
                        ) : (
                          "Démarrer"
                        )}
                      </Button>
                    )}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={
                            updatingOrderId === order.id
                          }
                        >
                          {updatingOrderId === order.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-primary"></div>
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {orderStatus !== "termine" &&
                          orderStatus !== "annule" &&
                          orderStatus !== "reporte" && (
                            <DropdownMenuItem
                              onClick={() =>
                                changeOrderStatus(order, "reporte")
                              }
                            >
                              Marquer Reporté
                            </DropdownMenuItem>
                          )}

                        {orderStatus !== "annule" &&
                          orderStatus !== "termine" && (
                            <DropdownMenuItem
                              onClick={() => changeOrderStatus(order, "annule")}
                            >
                              Marquer Annulé
                            </DropdownMenuItem>
                          )}
                        <DropdownMenuItem onClick={() => onCloneOrder(order.id)}>
                          <CopyIcon className="mr-2 h-4 w-4" />
                          Cloner Commande
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onTogglePriority(order.id, order.is_priority || false)}>
                          <StarIcon className="mr-2 h-4 w-4" />
                          {order.is_priority ? "Retirer Priorité" : "Marquer Prioritaire"}
                        </DropdownMenuItem>
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
