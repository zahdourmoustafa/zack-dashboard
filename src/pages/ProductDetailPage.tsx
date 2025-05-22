import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSupabase } from "@/context/SupabaseContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package2, ListOrderedIcon } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  process_steps: string[];
  created_at?: string;
  updated_at?: string;
}

const ProductDetailPage = () => {
  const { id: productId } = useParams<{ id: string }>();
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!supabase || !productId) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", productId)
          .single();

        if (error) throw error;

        setProduct(
          data ? { ...data, process_steps: data.process_steps || [] } : null
        );
      } catch (error: any) {
        console.error("Error fetching product details:", error);
        toast({
          title: "Erreur",
          description:
            error.message || "Impossible de charger les détails du produit.",
          variant: "destructive",
        });
        setProduct(null); // Ensure product is null on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [supabase, productId, toast]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[calc(100vh-150px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brandSecondary"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-xl text-slate-500">Produit non trouvé.</p>
        <Button
          onClick={() => navigate("/products")}
          variant="link"
          className="mt-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour à la liste des produits
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        onClick={() => navigate("/products")}
        variant="outline"
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Retour aux produits
      </Button>

      <Card className="shadow-xl">
        <CardHeader className="bg-slate-50 rounded-t-lg border-b">
          <div className="flex items-center gap-3">
            <Package2 className="h-8 w-8 text-brandPrimary" />
            <div>
              <CardTitle className="text-3xl font-bold text-brandPrimary">
                {product.name}
              </CardTitle>
              {product.description && (
                <CardDescription className="text-md text-slate-600 mt-1">
                  {product.description}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2 flex items-center">
                <ListOrderedIcon className="mr-2 h-5 w-5 text-brandSecondary" />
                Étapes du Processus
              </h3>
              {product.process_steps && product.process_steps.length > 0 ? (
                <ul className="list-none space-y-2">
                  {product.process_steps.map((step, index) => (
                    <li key={index} className="flex items-center">
                      <Badge
                        variant="outline"
                        className="text-sm bg-yellow-100 text-yellow-800 border-yellow-300 px-3 py-1 rounded-full shadow-sm"
                      >
                        {index + 1}. {step}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">
                  Aucune étape de processus définie pour ce produit.
                </p>
              )}
            </div>

            {product.created_at && (
              <div className="text-xs text-slate-500 pt-4 border-t mt-6">
                Créé le:{" "}
                {new Date(product.created_at).toLocaleDateString("fr-FR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {product.updated_at &&
                  product.updated_at !== product.created_at && (
                    <span className="ml-4">
                      Dernière modification:{" "}
                      {new Date(product.updated_at).toLocaleDateString(
                        "fr-FR",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </span>
                  )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductDetailPage;
