import React, { useEffect } from "react";
import { Check } from "lucide-react";
import { Button } from "./ui/button";

interface OrderProgressProps {
  steps: string[];
  currentStep: number;
  status: "en_attente" | "en_cours" | "termine" | "reporte" | "annule";
  onNextStep: () => void;
  onStatusChange: (
    newStatus: "en_attente" | "en_cours" | "termine" | "reporte" | "annule"
  ) => void;
}

const OrderProgress: React.FC<OrderProgressProps> = ({
  steps,
  currentStep,
  status,
  onNextStep,
  onStatusChange,
}) => {
  // Function to handle the first button click (Passer à "Impression")
  const handleFirstButtonClick = () => {
    // Change status from en_attente to en_cours
    onStatusChange("en_cours");
    // Then proceed with the next step logic
    onNextStep();
  };

  // Effect to automatically update the status if we're past the first step but still in "en_attente"
  useEffect(() => {
    if (currentStep > 0 && status === "en_attente") {
      onStatusChange("en_cours");
    }
  }, [currentStep, status, onStatusChange]);

  // Extract the name of the next step
  const getNextStepName = () => {
    if (currentStep < steps.length - 1) {
      return steps[currentStep + 1];
    }
    return "Terminé";
  };

  return (
    <div className="mb-6">
      <h5 className="text-sm font-medium mb-3">Progression:</h5>
      <div className="flex items-center space-x-2 overflow-x-auto pb-2">
        {steps.map((step, stepIndex) => (
          <div
            key={`step-${step}`}
            className="flex flex-col items-center min-w-[80px]"
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                currentStep > stepIndex || status === "termine"
                  ? "bg-green-500 border-green-500 text-white"
                  : currentStep === stepIndex &&
                    status !== "annule" &&
                    status !== "reporte" &&
                    status !== "en_attente"
                  ? "bg-blue-500 border-blue-500 text-white animate-pulse"
                  : "bg-gray-200 border-gray-300"
              }`}
            >
              {currentStep > stepIndex || status === "termine" ? (
                <Check className="h-4 w-4" />
              ) : (
                <span>{stepIndex + 1}</span>
              )}
            </div>
            <p
              className={`mt-1 text-xs text-center ${
                currentStep >= stepIndex
                  ? "font-semibold"
                  : "text-muted-foreground"
              }`}
            >
              {step}
            </p>
          </div>
        ))}
      </div>

      {status !== "termine" && status !== "annule" && status !== "reporte" && (
        <div className="mt-3">
          {/* Button to change status from "en_attente" to "en_cours" */}
          {status === "en_attente" && currentStep === 0 && (
            <Button
              size="sm"
              onClick={handleFirstButtonClick}
              className="bg-green-500 hover:bg-green-600 text-white font-semibold"
            >
              Démarrer
            </Button>
          )}

          {/* Button for steps beyond the first one */}
          {(status === "en_cours" ||
            (status === "en_attente" && currentStep > 0)) &&
            currentStep < steps.length - 1 && (
              <Button
                size="sm"
                onClick={() => {
                  if (status === "en_attente") {
                    onStatusChange("en_cours");
                  }
                  onNextStep();
                }}
                className="bg-brandSecondary hover:bg-yellow-400 text-brandPrimary font-semibold"
              >
                Passer à "{getNextStepName()}"
              </Button>
            )}

          {/* Complete button if on last step */}
          {currentStep >= steps.length - 1 && (
            <Button
              size="sm"
              onClick={onNextStep}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              <Check className="mr-1 h-3 w-3" /> Terminer
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default OrderProgress;
