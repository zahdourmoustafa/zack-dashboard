import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Plus, ArrowUp, ArrowDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
}

const AVAILABLE_PROCESS_STEPS = [
  "Conception",
  "Impression",
  "Plastification",
  "Pelliculage",
  "Découpe",
];
const FINAL_STEP = "Emballage";

const ProductForm = ({ product, onSuccess }: ProductFormProps) => {
  const { toast } = useToast();

  const initialProcessSteps = product?.process_steps
    ? product.process_steps.filter((step) => step !== FINAL_STEP)
    : [];

  const [formData, setFormData] = useState({
    name: product?.name || "",
    description: product?.description || "",
    process_steps: initialProcessSteps,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const currentInitialSteps = product?.process_steps
      ? product.process_steps.filter((step) => step !== FINAL_STEP)
      : [];
    setFormData((prev) => ({
      name: product?.name || "",
      description: product?.description || "",
      process_steps: currentInitialSteps,
    }));
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
      return { ...prev, process_steps: newSteps };
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

    if (formData.name.trim() === "") {
      toast({
        title: "Erreur de validation",
        description: "Le nom du produit est requis.",
        variant: "destructive",
      });
      return;
    }

    if (formData.process_steps.length === 0) {
      toast({
        title: "Erreur de validation",
        description: "Veuillez sélectionner au moins une étape de processus.",
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
          .update(productData)
          .eq("id", product.id);
      } else {
        result = await supabase.from("products").insert(productData);
      }

      if (result.error) throw result.error;

      toast({
        title: product ? "Produit mis à jour" : "Produit ajouté",
        description: `${formData.name} a été ${
          product ? "mis à jour" : "ajouté"
        } avec succès.`,
      });

      onSuccess();
    } catch (error) {
      console.error("Error saving product:", error);
      toast({
        title: "Erreur",
        description:
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
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (Optionnel)</Label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Description détaillée du produit"
          className="w-full p-2 border rounded-md min-h-[80px]"
        />
      </div>

      <div className="space-y-2">
        <Label>Étapes du Processus (sélectionnez parmi la liste)</Label>
        <div className="space-y-2 rounded-md border p-4">
          {AVAILABLE_PROCESS_STEPS.map((step) => (
            <div key={step} className="flex items-center space-x-2">
              <Checkbox
                id={`step-${step}`}
                checked={formData.process_steps.includes(step)}
                onCheckedChange={() => handleStepToggle(step)}
              />
              <Label htmlFor={`step-${step}`} className="font-normal">
                {step}
              </Label>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          <Label>
            Étapes Sélectionnées (dans l'ordre) - "{FINAL_STEP}" sera ajoutée à
            la fin
          </Label>
          {formData.process_steps.length === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Aucune étape sélectionnée
            </div>
          ) : (
            <ul className="space-y-2">
              {formData.process_steps.map((step, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between p-2 border rounded-md bg-secondary/20"
                >
                  <Badge variant="secondary" className="mr-2">
                    {index + 1}
                  </Badge>
                  <span className="flex-1">{step}</span>
                  <div className="flex space-x-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => handleMoveStep(index, "up")}
                      disabled={index === 0}
                      title="Monter l'étape"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => handleMoveStep(index, "down")}
                      disabled={index === formData.process_steps.length - 1}
                      title="Descendre l'étape"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemoveStep(index)}
                      title="Supprimer de la sélection"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {formData.process_steps.length > 0 && (
            <div className="mt-2 p-2 border rounded-md bg-sky-100 dark:bg-sky-900 text-sm text-sky-700 dark:text-sky-300">
              + <strong>{FINAL_STEP}</strong> (sera ajoutée automatiquement)
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
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
