import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ProductForm from "@/components/ProductForm";
import { useSupabase } from "@/context/SupabaseContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button"; // Added for back button

interface Product {
  id: string;
  name: string;
  description: string | null;
  process_steps: string[];
  created_at?: string;
  updated_at?: string;
}

const ProductFormPage = () => {
  const { id: productId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { supabase } = useSupabase();
  const { toast } = useToast();
  const [product, setProduct] = useState<Product | null | undefined>(undefined); // undefined for loading, null for new
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (productId && supabase) {
      const fetchProduct = async () => {
        setIsLoading(true);
        try {
          const { data, error } = await supabase
            .from("products")
            .select("*")
            .eq("id", productId)
            .single();

          if (error) throw error;
          if (data) {
            setProduct({
              ...data,
              process_steps: data.process_steps || [],
              description: data.description || null,
            } as Product);
          } else {
            toast({
              title: "Erreur",
              description: "Produit non trouvé.",
              variant: "destructive",
            });
            navigate("/products"); // Redirect if product not found
          }
        } catch (error: any) {
          console.error("Error fetching product:", error);
          toast({
            title: "Erreur de chargement",
            description:
              error.message || "Impossible de charger les données du produit.",
            variant: "destructive",
          });
          navigate("/products");
        } finally {
          setIsLoading(false);
        }
      };
      fetchProduct();
    } else if (!productId) {
      setProduct(null); // Explicitly set to null for new product
    }
  }, [productId, supabase, navigate, toast]);

  const handleSuccess = () => {
    toast({
      title: productId ? "Produit mis à jour" : "Produit créé",
      description: `Le produit a été ${
        productId ? "mis à jour" : "créé"
      } avec succès.`,
      variant: "default", // Changed to default from success as success is not a variant
    });
    navigate("/products");
  };

  const handleCancel = () => {
    navigate("/products");
  };

  if (isLoading || product === undefined) {
    return (
      <div className="container mx-auto px-4 py-8 bg-white min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brandSecondary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 bg-white min-h-screen">
      <div className="mb-6">
        <Button variant="outline" onClick={() => navigate(-1)} className="mb-4">
          &larr; Retour
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold text-brandPrimary">
          {productId ? "Modifier le Produit" : "Créer un Nouveau Produit"}
        </h1>
        {product && productId && (
          <p className="text-slate-600">
            Modification du produit : {product.name}
          </p>
        )}
      </div>
      <ProductForm
        product={product} // product can be null for new, or a Product object for edit
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default ProductFormPage;
