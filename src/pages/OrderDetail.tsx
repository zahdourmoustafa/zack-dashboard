import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Calendar,
  Check,
  CircleChevronRight,
  Trash2,
  PackageIcon,
  ListOrderedIcon,
  ClipboardListIcon,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Confetti } from "@/components/magicui/confetti";
import {
  Order,
  Client,
  Product,
  OrderHistoryEntry,
  getStatusColor,
  getStatusText,
} from "@/lib/mock-data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [explodeConfetti, setExplodeConfetti] = useState(false);
  const [isDeleteOrderDialogOpen, setIsDeleteOrderDialogOpen] = useState(false);

  // For tracking current product being modified
  const [activeProductId, setActiveProductId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      navigate("/");
      return;
    }

    const fetchOrderDetails = async () => {
      setIsLoading(true);
      try {
        const { data: orderData, error: orderError } = await supabase
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
            order_source,
            clients ( id, full_name, email, phone ),
            order_items (
              id,
              quantity,
              item_notes,
              status,
              current_step_index,
              product_id,
              product:product_id (
                id, 
                name, 
                description, 
                process_steps
              )
            )
          `
          )
          .eq("id", id)
          .single();

        if (orderError || !orderData) {
          toast({
            title: "Erreur",
            description: "Commande non trouvée.",
            variant: "destructive",
          });
          navigate("/");
          return;
        }
        setOrder(orderData as unknown as Order);
      } catch (error) {
        console.error("Error fetching order details:", error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les détails de la commande.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderDetails();
  }, [id, navigate, toast, location.key]);

  if (isLoading || !order) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center h-[60vh] bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brandSecondary mx-auto"></div>
          <p className="mt-4 text-brandPrimary">
            Chargement des détails de la commande...
          </p>
        </div>
      </div>
    );
  }

  const mainProductForSteps = order.order_items?.[0]?.product;

  // Check if all products are complete/terminated
  const areAllProductsComplete = (
    itemsToCheck?: ReadonlyArray<Order["order_items"][0]>
  ) => {
    const currentOrderItems = itemsToCheck || order?.order_items;
    if (!currentOrderItems || currentOrderItems.length === 0) return false;

    return currentOrderItems.every((item) => {
      const effectiveStatus = item.status || "en_attente"; // Treat null status as 'en_attente'
      return effectiveStatus === "termine";
    });
  };

  // Update a specific product's status
  const updateProductStatus = async (
    itemId: string,
    newStatus: Order["status"]
  ) => {
    if (!order) return;

    // Prepare updated items for local state and check BEFORE setOrder is called
    const updatedOrderItems = order.order_items.map((item) =>
      item.id === itemId
        ? { ...item, status: newStatus, updated_at: new Date().toISOString() }
        : item
    );

    try {
      setActiveProductId(itemId);

      // Update the order_item with new status
      const { error } = await supabase
        .from("order_items")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", itemId);

      if (error) throw error;

      // Update local state using the pre-calculated updatedOrderItems
      setOrder((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          order_items: updatedOrderItems,
        };
      });

      toast({
        title: "Statut du produit mis à jour",
        description: `Le statut du produit a été changé en "${getStatusText(
          newStatus
        )}".`,
      });

      // Check if all products are now complete using the updated items list
      // And if the overall order status needs to change
      if (
        newStatus === "termine" &&
        order.status !== "termine" && // Check current order status before attempting change
        areAllProductsComplete(updatedOrderItems) // Pass the definitive updated list
      ) {
        await handleStatusChange("termine");
      }
    } catch (error) {
      console.error("Error updating product status:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut de ce produit.",
        variant: "destructive",
      });
    } finally {
      setActiveProductId(null);
    }
  };

  // Function to go back to a specific step for a product
  const handleProductGoToStep = async (
    itemId: string,
    targetStepIndex: number
  ) => {
    if (!order) return;

    const orderItem = order.order_items.find((item) => item.id === itemId);
    if (!orderItem || !orderItem.product || !orderItem.product.process_steps) {
      toast({
        title: "Erreur",
        description: "Produit ou étapes de processus non trouvés.",
        variant: "destructive",
      });
      return;
    }

    if (
      targetStepIndex < 0 ||
      targetStepIndex >= orderItem.product.process_steps.length
    ) {
      toast({
        title: "Erreur",
        description: "Index de l'étape cible invalide.",
        variant: "destructive",
      });
      return;
    }

    const newStatus: Order["status"] = "en_cours"; // Always set to 'en_cours' when going back

    // Prepare updated items for local state and checks BEFORE setOrder is called
    const updatedOrderItems = order.order_items.map((item) =>
      item.id === itemId
        ? {
            ...item,
            current_step_index: targetStepIndex,
            status: newStatus,
            updated_at: new Date().toISOString(),
          }
        : item
    );

    try {
      setActiveProductId(itemId);

      const { error } = await supabase
        .from("order_items")
        .update({
          current_step_index: targetStepIndex,
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", itemId);

      if (error) throw error;

      setOrder((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          order_items: updatedOrderItems,
        };
      });

      toast({
        title: "Étape modifiée",
        description: `Le produit est revenu à l'étape "${orderItem.product.process_steps[targetStepIndex]}". Statut mis à jour.`,
      });

      // If the overall order was 'termine' and now this product is not,
      // set the overall order status back to 'en_cours'
      if (
        order.status === "termine" &&
        !areAllProductsComplete(updatedOrderItems)
      ) {
        await handleStatusChange("en_cours");
      }
    } catch (error) {
      console.error("Error going to product step:", error);
      toast({
        title: "Erreur",
        description:
          "Impossible de revenir à l'étape précédente pour ce produit.",
        variant: "destructive",
      });
    } finally {
      setActiveProductId(null);
    }
  };

  // New function to set a product to a specific step or start it
  const handleProductSetStep = async (
    itemId: string,
    targetStepIndex: number
  ) => {
    if (!order) return;

    const orderItem = order.order_items.find((item) => item.id === itemId);
    if (
      !orderItem ||
      !orderItem.product ||
      !orderItem.product.process_steps ||
      orderItem.product.process_steps.length === 0
    ) {
      toast({
        title: "Erreur de progression",
        description:
          "Ce produit n'a pas d'étapes de processus définies pour être démarré ou avancé.",
        variant: "destructive",
      });
      // If no steps, and we are trying to set one, perhaps complete it if status allows?
      // For now, this is mainly called when steps DO exist.
      // The button logic should prevent calling this if no steps.
      if (
        orderItem &&
        (!orderItem.product.process_steps ||
          orderItem.product.process_steps.length === 0) &&
        orderItem.status !== "termine" &&
        orderItem.status !== "annule"
      ) {
        await updateProductStatus(itemId, "termine");
      }
      return;
    }

    const productSteps = orderItem.product.process_steps;

    if (targetStepIndex < 0 || targetStepIndex >= productSteps.length) {
      toast({
        title: "Erreur d'étape",
        description: `L'index de l'étape cible (${targetStepIndex}) est invalide pour ce produit.`,
        variant: "destructive",
      });
      return;
    }

    const newStepName = productSteps[targetStepIndex];
    const newStatus: Order["status"] = "en_cours"; // Always set to en_cours when actively setting/advancing a step

    // Prepare updated items for local state
    const updatedOrderItems = order.order_items.map((i) =>
      i.id === itemId
        ? {
            ...i,
            current_step_index: targetStepIndex,
            status: newStatus,
            updated_at: new Date().toISOString(),
          }
        : i
    );

    try {
      setActiveProductId(itemId);

      const { error } = await supabase
        .from("order_items")
        .update({
          current_step_index: targetStepIndex,
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", itemId);

      if (error) throw error;

      setOrder((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          order_items: updatedOrderItems,
        };
      });

      const actionText =
        orderItem.current_step_index === null && targetStepIndex === 0
          ? "Démarré"
          : "Progression";
      toast({
        title: `${actionText}: ${newStepName}`,
        description: `Le produit est maintenant à l'étape "${newStepName}". Statut: ${getStatusText(
          newStatus
        )}.`,
      });

      // If the product is now 'en_cours' and the overall order is 'en_attente',
      // update the overall order status to 'en_cours'.
      if (newStatus === "en_cours" && order.status === "en_attente") {
        await handleStatusChange("en_cours");
      }

      // Check if ALL products are now complete AFTER this step change.
      // This is important if setting this step makes the product complete AND all others are complete.
      // However, the primary "Terminer" button for the product itself handles individual product completion.
      // The check for overall order completion `areAllProductsComplete` is more relevant inside `updateProductStatus`
      // when a product *becomes* "termine".
      // For now, we won't trigger overall order status change from here, to keep logic distinct.
    } catch (err) {
      console.error("Error setting product step:", err);
      const errorMessage =
        err instanceof Error && err.message
          ? err.message
          : "Une erreur inconnue est survenue.";
      toast({
        title: "Erreur de mise à jour",
        description: `Impossible de mettre à jour l'étape du produit. ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setActiveProductId(null);
    }
  };

  const handleStatusChange = async (newStatus: Order["status"]) => {
    if (!order) return;

    const oldStatus = order.status;
    let stepNameForHistory = oldStatus.toString();

    const productForHistory = mainProductForSteps;

    if (productForHistory) {
      if (
        newStatus === "termine" &&
        (!productForHistory.process_steps ||
          productForHistory.process_steps.length === 0)
      ) {
        stepNameForHistory = "Finalisé (sans étapes définies)";
      } else if (
        oldStatus === "en_attente" &&
        newStatus === "en_cours" &&
        (!productForHistory.process_steps ||
          productForHistory.process_steps.length === 0)
      ) {
        stepNameForHistory = "Traitement initié";
      } else if (
        productForHistory.process_steps &&
        productForHistory.process_steps.length > 0 &&
        order.current_step_index >= 0 &&
        order.current_step_index < productForHistory.process_steps.length
      ) {
        stepNameForHistory =
          productForHistory.process_steps[order.current_step_index];
      } else if (newStatus === "termine") {
        stepNameForHistory = "Finalisation";
      }
    } else if (newStatus === "termine") {
      stepNameForHistory = "Finalisation (produit non spécifié)";
    } else {
      stepNameForHistory = `Changement vers ${getStatusText(newStatus)}`;
    }

    const newHistoryEntry = {
      step: stepNameForHistory,
      status: newStatus,
      timestamp: new Date().toISOString(),
    };
    const updatedHistory = [
      ...(Array.isArray(order.history) ? order.history : []),
      newHistoryEntry,
    ];

    try {
      const { data, error } = await supabase
        .from("orders")
        .update({
          status: newStatus,
          history: updatedHistory as any[],
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id)
        .select()
        .single();

      if (error) throw error;

      setOrder((prevOrder) => {
        if (!prevOrder) return null;
        if (
          !data ||
          typeof data.status === "undefined" ||
          typeof data.history === "undefined"
        ) {
          console.error("Incomplete data from Supabase update:", data);
          return prevOrder;
        }
        const { history, status, ...restOfData } = data;
        return {
          ...prevOrder,
          ...restOfData,
          status: status as Order["status"],
          history: history
            ? (history as unknown as OrderHistoryEntry[])
            : undefined,
        };
      });

      toast({
        title: "Statut mis à jour",
        description: `Le statut a été changé en "${getStatusText(newStatus)}".`,
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut.",
        variant: "destructive",
      });
    }
  };

  const confirmDeleteOrder = async () => {
    if (!order || !order.id) {
      toast({
        title: "Erreur",
        description: "ID de commande manquant.",
        variant: "destructive",
      });
      return;
    }
    try {
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", order.id);
      if (error) {
        if (error.code === "23503") {
          toast({
            title: "Suppression Impossible",
            description:
              "Cette commande ne peut pas être supprimée car elle est référencée ailleurs (ex: paiements, livraisons). Veuillez d'abord supprimer ces références.",
            variant: "destructive",
            duration: 7000,
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Commande Supprimée",
          description: `La commande #${order.id} a été supprimée.`,
        });
        navigate("/");
      }
    } catch (error) {
      console.error("Error deleting order:", error);
      toast({
        title: "Erreur de Suppression",
        description: "Impossible de supprimer la commande.",
        variant: "destructive",
      });
    } finally {
      setIsDeleteOrderDialogOpen(false);
    }
  };

  const renderCurrentStepMessage = () => {
    if (!order) return "";
    if (order.status === "termine") return "Toutes les étapes sont terminées";
    if (order.status === "reporte" || order.status === "annule")
      return "Commande en pause";

    if (
      mainProductForSteps &&
      mainProductForSteps.process_steps &&
      mainProductForSteps.process_steps.length > 0 &&
      order.current_step_index >= 0 &&
      order.current_step_index < mainProductForSteps.process_steps.length
    ) {
      return `Étape actuelle (principale): ${
        mainProductForSteps.process_steps[order.current_step_index]
      }`;
    }
    if (
      !mainProductForSteps ||
      !mainProductForSteps.process_steps ||
      mainProductForSteps.process_steps.length === 0
    ) {
      return "Étapes de production non définies pour le produit principal.";
    }
    return "Progression inconnue";
  };

  const renderProductDetails = () => {
    if (!order.order_items || order.order_items.length === 0) {
      return (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <PackageIcon className="mr-2 h-5 w-5" /> Produits Commandés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Aucun produit associé à cette commande.</p>
          </CardContent>
        </Card>
      );
    }

    const sortedOrderItems = [...order.order_items].sort((a, b) => {
      const statusA = a.status || "en_attente";
      const statusB = b.status || "en_attente";
      if (statusA === "en_cours" && statusB !== "en_cours") return -1;
      if (statusA !== "en_cours" && statusB === "en_cours") return 1;
      return 0;
    });

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <PackageIcon className="mr-2 h-5 w-5" /> Produits Commandés
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {sortedOrderItems.map((item, index) => {
            const hasProcessSteps =
              item.product?.process_steps &&
              item.product.process_steps.length > 0;
            const actualCurrentIdx = item.current_step_index; // Can be null or number

            return (
              <div
                key={item.id || index}
                className="p-3 sm:p-4 border rounded-md bg-slate-50/50"
              >
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-2 gap-1 sm:gap-0">
                  <h4 className="font-semibold text-base sm:text-md">
                    {item.product?.name || "Produit non spécifié"}
                  </h4>
                  <Badge
                    variant="outline"
                    className={`self-start ${getStatusColor(
                      item.status || "en_attente"
                    )}`}
                  >
                    {getStatusText(item.status || "en_attente")}
                  </Badge>
                </div>

                <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm mb-3">
                  <span className="text-muted-foreground">Quantité:</span>
                  <span className="font-medium">{item.quantity}</span>
                  {item.product?.price !== undefined && (
                    <>
                      <span className="text-muted-foreground">
                        Prix unitaire:
                      </span>
                      <span className="font-medium">
                        {item.product.price.toLocaleString("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                        })}
                      </span>
                    </>
                  )}
                </div>

                {/* Product progression */}
                {item.product?.process_steps &&
                  item.product.process_steps.length > 0 && (
                    <div className="mt-3 mb-3">
                      <h5 className="text-sm font-medium mb-2">Progression:</h5>
                      <div className="flex flex-wrap items-center gap-2 pb-2">
                        {item.product.process_steps.map((step, stepIndex) => {
                          let stepState: "completed" | "active" | "pending" =
                            "pending";
                          const itemStatus = item.status || "en_attente";

                          if (itemStatus === "termine") {
                            stepState = "completed";
                          } else if (
                            itemStatus === "annule" ||
                            itemStatus === "reporte"
                          ) {
                            stepState = "pending";
                          } else if (itemStatus === "en_cours") {
                            if (typeof actualCurrentIdx === "number") {
                              if (actualCurrentIdx > stepIndex)
                                stepState = "completed";
                              else if (actualCurrentIdx === stepIndex)
                                stepState = "active";
                              else stepState = "pending";
                            } else {
                              stepState = "pending"; // Should ideally not happen if en_cours implies a step
                            }
                          } else if (itemStatus === "en_attente") {
                            stepState = "pending"; // All steps pending if item not started
                          }

                          const isCompleted = stepState === "completed";
                          const isActive = stepState === "active";

                          const canGoToThisStep =
                            isCompleted && // Only allow going back to completed steps
                            stepIndex < (actualCurrentIdx ?? Infinity) && // Ensure it's a previous step
                            itemStatus !== "annule" &&
                            itemStatus !== "reporte" &&
                            activeProductId !== item.id;

                          return (
                            <div
                              key={`${item.id}-${step}-${stepIndex}`}
                              className={`flex flex-col items-center min-w-[70px] p-1 ${
                                canGoToThisStep
                                  ? "cursor-pointer hover:opacity-75 transition-opacity"
                                  : "cursor-default"
                              }`}
                              onClick={() => {
                                if (canGoToThisStep) {
                                  handleProductGoToStep(
                                    item.id as string,
                                    stepIndex
                                  );
                                }
                              }}
                            >
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                                  isCompleted
                                    ? "bg-green-500 border-green-500 text-white"
                                    : isActive
                                    ? "bg-blue-500 border-blue-500 text-white"
                                    : "bg-gray-200 border-gray-300 text-gray-500"
                                }`}
                              >
                                {isCompleted ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <span>{stepIndex + 1}</span>
                                )}
                              </div>
                              <p
                                className={`mt-1 text-xs text-center transition-colors duration-300 ${
                                  (isCompleted || isActive) &&
                                  itemStatus !== "annule" &&
                                  itemStatus !== "reporte"
                                    ? "font-semibold text-slate-700"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {step}
                              </p>
                            </div>
                          );
                        })}
                      </div>

                      {/* Controls for this product */}
                      {item.status !== "termine" &&
                        item.status !== "annule" && (
                          <div className="mt-3">
                            {hasProcessSteps ? (
                              <>
                                {/* Button to START the first step */}
                                {item.status === "en_attente" && (
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      handleProductSetStep(item.id as string, 0)
                                    }
                                    className="bg-brandSecondary hover:bg-yellow-400 text-brandPrimary font-semibold"
                                    disabled={activeProductId === item.id}
                                  >
                                    Passer à "{item.product.process_steps[0]}"
                                    <CircleChevronRight className="ml-1 h-3 w-3" />
                                  </Button>
                                )}

                                {/* Buttons when IN PROGRESS */}
                                {item.status === "en_cours" && (
                                  <>
                                    {/* Button to advance to NEXT step */}
                                    {typeof actualCurrentIdx === "number" &&
                                      actualCurrentIdx <
                                        item.product.process_steps.length -
                                          1 && (
                                        <Button
                                          size="sm"
                                          onClick={() =>
                                            handleProductSetStep(
                                              item.id as string,
                                              actualCurrentIdx + 1
                                            )
                                          }
                                          className="bg-brandSecondary hover:bg-yellow-400 text-brandPrimary font-semibold"
                                          disabled={activeProductId === item.id}
                                        >
                                          Passer à "
                                          {
                                            item.product.process_steps[
                                              actualCurrentIdx + 1
                                            ]
                                          }
                                          "
                                          <CircleChevronRight className="ml-1 h-3 w-3" />
                                        </Button>
                                      )}

                                    {/* Button to COMPLETE product when on the last step */}
                                    {typeof actualCurrentIdx === "number" &&
                                      actualCurrentIdx ===
                                        item.product.process_steps.length -
                                          1 && (
                                        <Button
                                          size="sm"
                                          onClick={() =>
                                            updateProductStatus(
                                              item.id as string,
                                              "termine"
                                            )
                                          }
                                          className="bg-green-500 hover:bg-green-600 text-white"
                                          disabled={activeProductId === item.id}
                                        >
                                          <Check className="mr-1 h-3 w-3" />{" "}
                                          Terminer
                                        </Button>
                                      )}
                                  </>
                                )}
                              </>
                            ) : (
                              /* Case: Product has NO process steps defined (or empty array) - Show Terminer */
                              <Button
                                size="sm"
                                onClick={() =>
                                  updateProductStatus(
                                    item.id as string,
                                    "termine"
                                  )
                                }
                                className="bg-green-500 hover:bg-green-600 text-white"
                                disabled={activeProductId === item.id}
                              >
                                <Check className="mr-1 h-3 w-3" /> Terminer
                              </Button>
                            )}
                          </div>
                        )}

                      {/* If this product is complete */}
                      {item.status === "termine" && (
                        <div className="mt-3">
                          <Badge
                            variant="outline"
                            className="bg-green-100 text-green-800 border-green-300"
                          >
                            Produit Terminé
                          </Badge>
                        </div>
                      )}
                    </div>
                  )}

                {item.product?.description && (
                  <div className="mt-3 text-sm">
                    <span className="text-muted-foreground">Description:</span>
                    <p className="text-slate-700">{item.product.description}</p>
                  </div>
                )}
                {item.item_notes && (
                  <div className="mt-2 text-sm">
                    <span className="text-muted-foreground">
                      Notes spécifiques:
                    </span>
                    <p className="text-slate-700 whitespace-pre-wrap">
                      {item.item_notes}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 bg-white min-h-screen">
      {explodeConfetti && <Confetti />}
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="border-brandPrimary text-brandPrimary hover:bg-brandPrimary hover:text-slate-50"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-brandPrimary mb-4 md:mb-0">
          Détails de la Commande{" "}
          <span className="text-brandSecondary">
            #{order.id.substring(0, 8)}
          </span>
        </h1>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <Badge
            variant="outline"
            className={`${getStatusColor(order.status)} text-sm px-3 py-1`}
          >
            {getStatusText(order.status)}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Passée le{" "}
            {format(new Date(order.order_date), "dd MMMM yyyy 'à' HH:mm", {
              locale: fr,
            })}
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 md:gap-6">
        {/* Client Card - Moved to the top and spans all columns */}
        {order.clients && (
          <div className="md:col-span-3">
            {" "}
            {/* Spans full width */}
            <Card className="shadow-lg mb-6">
              <CardHeader>
                <CardTitle className="flex items-center text-brandPrimary">
                  <User className="mr-2 h-5 w-5 text-brandSecondary" /> Client
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold">{order.clients.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  {order.clients.email}
                </p>
                <p className="text-sm text-muted-foreground">
                  {order.clients.phone}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* START - Order Source Card */}
        {order.order_source && (
          <div className="md:col-span-3">
            <Card className="shadow-lg mb-6">
              <CardHeader>
                <CardTitle className="flex items-center text-brandPrimary">
                  <ListOrderedIcon className="mr-2 h-5 w-5 text-brandSecondary" />{" "}
                  Source de la Commande
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-bold text-slate-700 capitalize">
                  {order.order_source.replace(/_/g, " ")}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
        {/* END - Order Source Card */}

        {/* Product Details and Notes - Takes up 2 columns */}
        <div className="md:col-span-2 space-y-6">
          {renderProductDetails()}

          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes de Commande</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions and History - Takes up 1 column */}
        <div className="space-y-6 md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Actions Rapides</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Select
                onValueChange={(value) =>
                  handleStatusChange(value as Order["status"])
                }
                value={order.status}
              >
                <SelectTrigger className="w-full border-brandPrimary text-brandPrimary focus:ring-brandSecondary">
                  <SelectValue placeholder="Changer statut commande" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Modifier le statut</SelectLabel>
                    {["en_cours", "reporte", "annule"].map((s) => (
                      <SelectItem
                        key={s}
                        value={s}
                        disabled={order.status === s}
                      >
                        {getStatusText(s)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => navigate(`/orders/edit/${order.id}`)}
              >
                Modifier la Commande
              </Button>
              <Dialog
                open={isDeleteOrderDialogOpen}
                onOpenChange={setIsDeleteOrderDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirmer la suppression</DialogTitle>
                    <DialogDescription>
                      Êtes-vous sûr de vouloir supprimer cette commande? Cette
                      action est irréversible. Les articles associés seront
                      également supprimés.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsDeleteOrderDialogOpen(false)}
                    >
                      Annuler
                    </Button>
                    <Button variant="destructive" onClick={confirmDeleteOrder}>
                      Supprimer Définitivement
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {order.history && order.history.length > 0 && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-brandPrimary">
                  <ClipboardListIcon className="mr-2 h-5 w-5 text-brandSecondary" />{" "}
                  Historique des Étapes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.history
                    .slice()
                    .reverse()
                    .map((entry, index) => (
                      <div key={index} className="text-xs">
                        <span
                          className={`font-semibold ${getStatusColor(
                            entry.status
                          )}`}
                        >
                          {getStatusText(entry.status)}
                        </span>{" "}
                        - {entry.step}
                        <p className="text-muted-foreground">
                          {format(
                            new Date(entry.timestamp),
                            "dd/MM/yyyy HH:mm",
                            { locale: fr }
                          )}
                        </p>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
