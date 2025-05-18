import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  const { toast } = useToast();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [explodeConfetti, setExplodeConfetti] = useState(false);
  const [isDeleteOrderDialogOpen, setIsDeleteOrderDialogOpen] = useState(false);

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
            product_id,
            quantity,
            clients ( id, full_name, email, phone ),
            products ( id, name, description, process_steps )
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
  }, [id, navigate, toast]);

  if (isLoading || !order) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Chargement des détails de la commande...</p>
        </div>
      </div>
    );
  }

  const mainProductForSteps = order.products;

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
          history: updatedHistory,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id)
        .select()
        .single();

      if (error) throw error;

      setOrder((prevOrder) => ({ ...prevOrder, ...data } as Order));

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

  const handleCompleteOrder = async () => {
    if (!order) return;
    await handleStatusChange("termine");
    setExplodeConfetti(true);
    setTimeout(() => setExplodeConfetti(false), 4000);
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

  const handleNextStep = async () => {
    if (
      !order ||
      !mainProductForSteps ||
      !mainProductForSteps.process_steps ||
      order.current_step_index >= mainProductForSteps.process_steps.length - 1
    ) {
      if (order.status !== "termine") {
        handleStatusChange("termine");
        toast({
          title: "Commande terminée",
          description:
            "Toutes les étapes sont complétées ou aucune étape principale définie. Commande marquée comme terminée.",
        });
      }
      return;
    }

    const newStepIndex = order.current_step_index + 1;
    const newStepName = mainProductForSteps.process_steps[newStepIndex];
    let newStatus = order.status === "en_attente" ? "en_cours" : order.status;

    const newHistoryEntry = {
      step: newStepName,
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
          current_step_index: newStepIndex,
          status: newStatus,
          history: updatedHistory,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id)
        .select()
        .single();

      if (error) throw error;
      setOrder((prevOrder) => ({ ...prevOrder, ...data } as Order));
      toast({
        title: "Étape suivante",
        description: `Progression à l'étape "${newStepName}".`,
      });
    } catch (error) {
      console.error("Error advancing to next step:", error);
      toast({
        title: "Erreur",
        description: "Impossible de passer à l'étape suivante.",
        variant: "destructive",
      });
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

  const client = order.clients;

  const canChangeOrderStatus =
    order.status !== "termine" &&
    order.status !== "annule" &&
    order.status !== "reporte";
  const hasSteps =
    mainProductForSteps &&
    mainProductForSteps.process_steps &&
    mainProductForSteps.process_steps.length > 0;
  const isOnLastStep =
    hasSteps &&
    order.current_step_index === mainProductForSteps.process_steps.length - 1;
  const canAdvanceToNextStep =
    hasSteps &&
    order.current_step_index < mainProductForSteps.process_steps.length - 1;

  const renderProductDetails = () => {
    if (!order.products) {
      return (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Produit</CardTitle>
          </CardHeader>
          <CardContent>Détails du produit non disponibles.</CardContent>
        </Card>
      );
    }
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <PackageIcon className="mr-2 h-5 w-5" /> Produit Commandé
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nom du produit:</span>
            <span className="font-semibold">{order.products.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Quantité:</span>
            <span className="font-semibold">{order.quantity}</span>
          </div>
          {order.products.price !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Prix unitaire:</span>
              <span className="font-semibold">{order.products.price}</span>
            </div>
          )}
          {order.products.description && (
            <div>
              <span className="text-muted-foreground">Description:</span>
              <p className="text-sm">{order.products.description}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderProductDetailsSimplified = () => {
    if (!order.products) {
      return (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Produit</CardTitle>
          </CardHeader>
          <CardContent>Détails du produit non disponibles.</CardContent>
        </Card>
      );
    }
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <PackageIcon className="mr-2 h-5 w-5" /> Produit Commandé
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nom du produit:</span>
            <span className="font-semibold">{order.products.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Quantité:</span>
            <span className="font-semibold">{order.quantity}</span>
          </div>
          {order.products.price !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Prix unitaire:</span>
              <span className="font-semibold">{order.products.price}</span>
            </div>
          )}
          {order.products.description && (
            <div>
              <span className="text-muted-foreground">Description:</span>
              <p className="text-sm">{order.products.description}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 relative">
      {explodeConfetti && (
        <>
          <Confetti
            className="fixed top-0 left-0 w-full h-full z-[200]"
            options={{
              particleCount: 80,
              spread: 80,
              angle: 50,
              origin: { x: 0, y: 1 },
              colors: [
                "#26ccff",
                "#a25afd",
                "#ff5e7e",
                "#88ff5a",
                "#fcff42",
                "#ffa62d",
                "#ff36ff",
              ],
              ticks: 300,
            }}
          />
          <Confetti
            className="fixed top-0 left-0 w-full h-full z-[200]"
            options={{
              particleCount: 80,
              spread: 80,
              angle: 130,
              origin: { x: 1, y: 1 },
              colors: [
                "#26ccff",
                "#a25afd",
                "#ff5e7e",
                "#88ff5a",
                "#fcff42",
                "#ffa62d",
                "#ff36ff",
              ],
              ticks: 300,
            }}
          />
        </>
      )}
      <Button
        variant="ghost"
        className="mb-6 flex items-center gap-1"
        onClick={() => navigate("/")}
      >
        <ArrowLeft className="h-4 w-4" /> Retour au tableau de bord
      </Button>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Commande #{order.id.substring(0, 8)}</CardTitle>
              <CardDescription>
                Passée le{" "}
                {format(new Date(order.order_date), "dd MMMM yyyy 'à' HH:mm", {
                  locale: fr,
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-sm text-muted-foreground">Statut:</span>
                  <Badge
                    variant="outline"
                    className={`${getStatusColor(order.status)} ml-2`}
                  >
                    {getStatusText(order.status)}
                  </Badge>
                </div>
              </div>
              {order.products &&
                order.products.process_steps &&
                order.products.process_steps.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-md font-semibold mb-3">Progression:</h3>
                    <div className="flex items-center space-x-2 overflow-x-auto pb-2">
                      {order.products.process_steps.map((step, index) => (
                        <div
                          key={step}
                          className="flex flex-col items-center min-w-[100px]"
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                              order.current_step_index > index ||
                              order.status === "termine"
                                ? "bg-green-500 border-green-500 text-white"
                                : order.current_step_index === index &&
                                  order.status !== "annule" &&
                                  order.status !== "reporte"
                                ? "bg-blue-500 border-blue-500 text-white animate-pulse"
                                : "bg-gray-200 border-gray-300"
                            }
                          `}
                          >
                            {order.current_step_index > index ||
                            order.status === "termine" ? (
                              <Check className="h-5 w-5" />
                            ) : (
                              <span>{index + 1}</span>
                            )}
                          </div>
                          <p
                            className={`mt-2 text-xs text-center ${
                              order.current_step_index >= index
                                ? "font-semibold"
                                : "text-muted-foreground"
                            }`}
                          >
                            {step}
                          </p>
                        </div>
                      ))}
                    </div>
                    {order.status !== "termine" &&
                      order.status !== "annule" &&
                      hasSteps && (
                        <div className="mt-4">
                          {isOnLastStep && (
                            <Button
                              onClick={handleCompleteOrder}
                              className="w-full md:w-auto"
                              size="sm"
                            >
                              <Check className="mr-2 h-4 w-4" /> Marquer comme
                              Terminé
                            </Button>
                          )}
                          {canAdvanceToNextStep && (
                            <Button
                              onClick={handleNextStep}
                              className="w-full md:w-auto"
                              variant="outline"
                              size="sm"
                            >
                              Passer à l'étape suivante{" "}
                              <CircleChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    <p className="text-sm text-muted-foreground mt-3">
                      Étape actuelle:{" "}
                      <strong>{renderCurrentStepMessage()}</strong>
                    </p>
                  </div>
                )}
            </CardContent>
          </Card>

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

        <div className="space-y-6">
          {order.clients && (
            <Card>
              <CardHeader>
                <CardTitle>Client</CardTitle>
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
          )}

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
                <SelectTrigger>
                  <SelectValue placeholder="Changer le statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Statut de la commande</SelectLabel>
                    {[
                      "en_attente",
                      "en_cours",
                      "reporte",
                      "annule",
                      "termine",
                    ].map((s) => (
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
                disabled
              >
                Modifier la Commande
              </Button>
              <Dialog
                open={isDeleteOrderDialogOpen}
                onOpenChange={setIsDeleteOrderDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" /> Supprimer la Commande
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
            <Card>
              <CardHeader>
                <CardTitle>Historique de la Commande</CardTitle>
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
