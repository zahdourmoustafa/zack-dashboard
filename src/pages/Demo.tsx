import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import OrderProgress from "@/components/OrderProgress";
import { Button } from "@/components/ui/button";

const Demo = () => {
  const [status, setStatus] = useState<
    "en_attente" | "en_cours" | "termine" | "reporte" | "annule"
  >("en_attente");
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    "Conception",
    "Impression",
    "Pelliculage",
    "Découpe",
    "Emballage",
  ];

  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      setStatus("termine");
    }
  };

  const handleStatusChange = (
    newStatus: "en_attente" | "en_cours" | "reporte" | "annule" | "termine"
  ) => {
    setStatus(newStatus);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Demo Étiquette Pilique</h1>

      <div className="max-w-md mx-auto">
        <Card className="mb-4">
          <CardHeader className="py-3 flex flex-row justify-between items-center">
            <div className="font-semibold">étiquette pilique</div>
            <div className="text-sm text-muted-foreground">
              En {status === "en_attente" ? "attente" : "cours"}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between mb-2">
              <div>Quantité:</div>
              <div className="font-medium">187</div>
            </div>

            <div className="mb-4">
              <div className="text-sm font-medium mb-1">Progression:</div>

              <OrderProgress
                steps={steps}
                currentStep={currentStep}
                status={status}
                onNextStep={handleNextStep}
                onStatusChange={handleStatusChange}
              />
            </div>

            <div className="mt-4">
              <div className="text-sm font-medium">Notes spécifiques:</div>
              <div className="text-sm mt-1">98989kjk</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Demo;
