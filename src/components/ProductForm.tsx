import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Plus, ArrowUp, ArrowDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSupabase } from "@/context/SupabaseContext";
import { Checkbox } from "@/components/ui/checkbox";

interface Product {
  id: string;
  name: string;
  description: string | null;
  process_steps: string[];
}

interface ProductFormProps {
  product?: Product | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const AVAILABLE_PROCESS_STEPS_DEFAULT = [
  "Conception",
  "Impression",
  "Plastification",
  "Pelliculage",
  "Découpe",
];
const FINAL_STEP = "Emballage";

const ProductForm = ({ product, onSuccess, onCancel }: ProductFormProps) => {
  const { toast } = useToast();
  const { supabase, isLoading: isSupabaseLoading } = useSupabase();

  const initialSelectedSteps = product?.process_steps
    ? product.process_steps.filter((step) => step !== FINAL_STEP)
    : [];

  const [formData, setFormData] = useState({
    name: product?.name || "",
    description: product?.description || "",
    process_steps: initialSelectedSteps,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCustomStep, setNewCustomStep] = useState("");
  const [availableProcessSteps, setAvailableProcessSteps] = useState(() => {
    const customStepsFromProduct = product?.process_steps
      ? product.process_steps.filter(
          (step) =>
            step !== FINAL_STEP &&
            !AVAILABLE_PROCESS_STEPS_DEFAULT.includes(step)
        )
      : [];
    return [
      ...AVAILABLE_PROCESS_STEPS_DEFAULT,
      ...new Set(customStepsFromProduct),
    ];
  });

  useEffect(() => {
    const currentInitialSelectedSteps = product?.process_steps
      ? product.process_steps.filter((step) => step !== FINAL_STEP)
      : [];

    const customStepsFromProduct = product?.process_steps
      ? product.process_steps.filter(
          (step) =>
            step !== FINAL_STEP &&
            !AVAILABLE_PROCESS_STEPS_DEFAULT.includes(step)
        )
      : [];
    setAvailableProcessSteps([
      ...AVAILABLE_PROCESS_STEPS_DEFAULT,
      ...new Set(customStepsFromProduct),
    ]);

    setFormData({
      name: product?.name || "",
      description: product?.description || "",
      process_steps: currentInitialSelectedSteps,
    });
  }, [product]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleStepToggle = (step: string) => {
    setFormData((prev) => {
      const newSteps = prev.process_steps.includes(step)
        ? prev.process_steps.filter((s) => s !== step)
        : [...prev.process_steps, step];
      if (
        newSteps.includes(step) &&
        !availableProcessSteps.includes(step) &&
        step !== FINAL_STEP
      ) {
        setAvailableProcessSteps((prevAvailable) => {
          if (!prevAvailable.includes(step)) {
            return [...prevAvailable, step];
          }
          return prevAvailable;
        });
      }
      return { ...prev, process_steps: newSteps };
    });
  };

  const handleAddCustomStep = () => {
    const trimmedStep = newCustomStep.trim();
    if (
      trimmedStep &&
      !availableProcessSteps.includes(trimmedStep) &&
      trimmedStep !== FINAL_STEP
    ) {
      setAvailableProcessSteps((prev) => [...prev, trimmedStep]);
      setFormData((prevData) => ({
        ...prevData,
        process_steps: [...prevData.process_steps, trimmedStep],
      }));
      setNewCustomStep("");
    } else if (
      availableProcessSteps.includes(trimmedStep) ||
      trimmedStep === FINAL_STEP
    ) {
      toast({
        title: "Étape Existante",
        description: `L'étape "${trimmedStep}" existe déjà ou est réservée.`,
        variant: "default",
      });
    } else if (!trimmedStep) {
      toast({
        title: "Entrée Invalide",
        description: "Le nom de l'étape ne peut pas être vide.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAvailableStep = (stepToDelete: string) => {
    if (AVAILABLE_PROCESS_STEPS_DEFAULT.includes(stepToDelete)) {
      toast({
        title: "Suppression Impossible",
        description: `L'étape par défaut "${stepToDelete}" ne peut pas être supprimée.`,
        variant: "default",
      });
      return;
    }

    setAvailableProcessSteps((prev) =>
      prev.filter((step) => step !== stepToDelete)
    );
    setFormData((prevData) => ({
      ...prevData,
      process_steps: prevData.process_steps.filter(
        (step) => step !== stepToDelete
      ),
    }));
    toast({
      title: "Étape Supprimée",
      description: `L'étape "${stepToDelete}" a été retirée de la liste des étapes disponibles.`,
    });
  };

  const handleRemoveStep = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      process_steps: prev.process_steps.filter((_, i) => i !== index),
    }));
  };

  const handleMoveStep = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === formData.process_steps.length - 1)
    ) {
      return;
    }

    const newSteps = [...formData.process_steps];
    const newIndex = direction === "up" ? index - 1 : index + 1;

    [newSteps[index], newSteps[newIndex]] = [
      newSteps[newIndex],
      newSteps[index],
    ];

    setFormData((prev) => ({
      ...prev,
      process_steps: newSteps,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSupabaseLoading || !supabase) {
      toast({
        title: "Veuillez patienter",
        description:
          "La connexion à la base de données est en cours d'initialisation.",
        variant: "default",
      });
      return;
    }

    if (formData.name.trim() === "") {
      toast({
        title: "Erreur de validation",
        description: "Le nom du produit est requis.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const stepsForSubmission = [...formData.process_steps];
    if (!stepsForSubmission.includes(FINAL_STEP)) {
      stepsForSubmission.push(FINAL_STEP);
    }

    try {
      const productData = {
        name: formData.name,
        process_steps: stepsForSubmission,
        description:
          formData.description.trim() === "" ? null : formData.description,
      };

      let result;
      if (product?.id) {
        result = await supabase
          .from("products")
          .update({ ...productData, updated_at: new Date().toISOString() })
          .eq("id", product.id)
          .select();
      } else {
        result = await supabase.from("products").insert(productData).select();
      }

      if (result.error) throw result.error;

      toast({
        title: product ? "Produit mis à jour" : "Produit ajouté",
        description: `${formData.name} a été ${
          product ? "mis à jour" : "ajouté"
        } avec succès.`,
      });

      onSuccess();
    } catch (error: any) {
      console.error("Error saving product:", error);
      toast({
        title: "Erreur d'enregistrement",
        description:
          error.message ||
          "Une erreur est survenue lors de l'enregistrement du produit.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Nom du Produit</Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="ex: Papier Photo Pellicule"
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (Optionnel)</Label>
        <textarea
          id="description"
          name="description"
          rows={3}
          value={formData.description}
          onChange={handleChange}
          placeholder="Description détaillée du produit"
          className="w-full p-2 border rounded-md focus:ring-2 focus:ring-brandPrimary focus:border-transparent transition-shadow shadow-sm"
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-4">
        <Label>Étapes du Processus (sélectionnez parmi la liste)</Label>
        <div className="max-h-40 overflow-y-auto border rounded-md p-3 space-y-2 bg-slate-50">
          {availableProcessSteps.map((step) => (
            <div key={step} className="flex items-center justify-between">
              <div className="flex items-center">
                <Checkbox
                  id={`step-${step}`}
                  checked={formData.process_steps.includes(step)}
                  onCheckedChange={() => handleStepToggle(step)}
                  disabled={isSubmitting || step === FINAL_STEP}
                />
                <Label
                  htmlFor={`step-${step}`}
                  className="ml-2 font-normal cursor-pointer"
                >
                  {step}
                </Label>
              </div>
              {!AVAILABLE_PROCESS_STEPS_DEFAULT.includes(step) &&
                step !== FINAL_STEP && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteAvailableStep(step)}
                    disabled={isSubmitting}
                    className="p-1 h-auto text-slate-400 hover:text-red-500"
                    aria-label={`Supprimer l'étape personnalisée ${step}`}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="newCustomStep">Ajouter une nouvelle étape</Label>
        <div className="flex items-center gap-2">
          <Input
            id="newCustomStep"
            value={newCustomStep}
            onChange={(e) => setNewCustomStep(e.target.value)}
            placeholder="ex: Vernissage Sélectif"
            className="flex-grow"
            disabled={isSubmitting}
          />
          <Button
            type="button"
            onClick={handleAddCustomStep}
            variant="outline"
            disabled={isSubmitting || !newCustomStep.trim()}
            className="px-3"
            aria-label="Ajouter la nouvelle étape"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>
          Étapes Sélectionnées (dans l'ordre) - "{FINAL_STEP}" sera ajoutée à la
          fin
        </Label>
        {formData.process_steps.length === 0 ? (
          <p className="text-sm text-slate-500 p-3 border rounded-md bg-slate-50">
            Aucune étape sélectionnée. "{FINAL_STEP}" sera la seule étape.
          </p>
        ) : (
          <ul className="space-y-2 border rounded-md p-3 bg-slate-50">
            {formData.process_steps.map((step, index) => (
              <li
                key={index}
                className="flex items-center justify-between p-2 bg-white rounded shadow-sm"
              >
                <span className="text-sm">
                  {index + 1}. {step}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMoveStep(index, "up")}
                    disabled={index === 0 || isSubmitting}
                    className="p-1 h-auto"
                    aria-label="Monter l'étape"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMoveStep(index, "down")}
                    disabled={
                      index === formData.process_steps.length - 1 ||
                      isSubmitting
                    }
                    className="p-1 h-auto"
                    aria-label="Descendre l'étape"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveStep(index)}
                    className="text-red-500 hover:text-red-700 p-1 h-auto"
                    disabled={isSubmitting}
                    aria-label="Supprimer l'étape"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="text-xs text-center text-slate-500 bg-blue-50 p-2 rounded-md border border-blue-200">
        + <strong>{FINAL_STEP}</strong> (sera ajoutée automatiquement)
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || isSupabaseLoading}
          className="bg-brandPrimary hover:bg-brandPrimary/90"
        >
          {isSubmitting
            ? "Enregistrement..."
            : product
            ? "Mettre à jour"
            : "Ajouter"}
        </Button>
      </div>
    </form>
  );
};

export default ProductForm;
