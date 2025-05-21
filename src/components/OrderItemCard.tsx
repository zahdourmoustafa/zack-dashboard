import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import OrderProgress from "./OrderProgress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./ui/use-toast";

interface OrderItemCardProps {
  id: string;
  title: string;
  quantity: number;
  status: "en_attente" | "en_cours" | "reporte" | "annule" | "termine";
  currentStepIndex: number;
  item_notes?: string;
  processSteps: string[];
}

const OrderItemCard: React.FC<OrderItemCardProps> = ({
  id,
  title,
  quantity,
  status,
  currentStepIndex,
  item_notes,
  processSteps,
}) => {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(status);
  const [currentStep, setCurrentStep] = useState(currentStepIndex);

  // Effect to ensure status is correct on initial load
  useEffect(() => {
    if (currentStep > 0 && currentStatus === "en_attente") {
      handleStatusChange("en_cours");
    }
  }, []);

  const handleNextStep = async () => {
    if (currentStep >= processSteps.length - 1) return;

    setIsUpdating(true);

    try {
      // Move to next step
      const newStepIndex = currentStep + 1;

      // Update status if needed
      let updatedStatus = currentStatus;
      if (currentStatus === "en_attente") {
        updatedStatus = "en_cours";
      }

      // Update in database
      const { error } = await supabase
        .from("order_items")
        .update({
          current_step_index: newStepIndex,
          status: updatedStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      // Update local state
      setCurrentStep(newStepIndex);

      // Also update status if it changed
      if (updatedStatus !== currentStatus) {
        setCurrentStatus(updatedStatus);
      }

      toast({
        title: "Étape suivante",
        description: `Progression à l'étape "${processSteps[newStepIndex]}" pour ce produit.`,
      });
    } catch (error) {
      console.error("Error updating step:", error);
      toast({
        title: "Erreur",
        description: "Impossible de passer à l'étape suivante.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusChange = async (
    newStatus: "en_attente" | "en_cours" | "reporte" | "annule" | "termine"
  ) => {
    if (newStatus === currentStatus) return;

    setIsUpdating(true);

    try {
      // Update in database
      const { error } = await supabase
        .from("order_items")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      // Update local state
      setCurrentStatus(newStatus);

      toast({
        title: "Statut mis à jour",
        description: `Statut changé pour "${newStatus}".`,
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Erreur",
        description: "Impossible de changer le statut.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="py-3 flex flex-row justify-between items-center">
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-muted-foreground">
          En {currentStatus === "en_attente" ? "attente" : "cours"}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between mb-2">
          <div>Quantité:</div>
          <div className="font-medium">{quantity}</div>
        </div>

        <div className="mb-3">
          <div className="text-sm font-medium mb-1">Progression:</div>

          <OrderProgress
            steps={processSteps}
            currentStep={currentStep}
            status={currentStatus}
            onNextStep={handleNextStep}
            onStatusChange={handleStatusChange}
          />
        </div>

        {item_notes && (
          <div className="mt-4">
            <div className="text-sm font-medium">Notes spécifiques:</div>
            <div className="text-sm mt-1">{item_notes}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OrderItemCard;
