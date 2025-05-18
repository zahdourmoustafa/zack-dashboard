import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Edit, Trash } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import ProductForm from "@/components/ProductForm";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Updated Product interface with process_steps array
interface Product {
  id: string;
  name: string;
  description: string | null;
  process_steps: string[];
  created_at?: string;
  updated_at?: string;
}

const ProductsPage = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch products from Supabase
  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from("products").select("*");

      if (error) throw error;

      // Data directly from Supabase should now have process_steps as an array
      // Ensure products have process_steps, default to empty array if null/undefined from DB
      const productsWithEnsuredSteps = data.map((product) => ({
        ...product,
        process_steps: product.process_steps || [],
        description: product.description || null, // Ensure description is null if not present
      })) as Product[];

      setProducts(productsWithEnsuredSteps);
      setFilteredProducts(productsWithEnsuredSteps);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les produits",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchProducts();
  }, []);

  // Filter products based on search query
  useEffect(() => {
    const filtered = products.filter((product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [searchQuery, products]);

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsDialogOpen(true);
  };

  const handleDeleteProduct = async (
    productId: string,
    productName: string
  ) => {
    try {
      // Check if the product is associated with any orders
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id")
        .eq("product_id", productId)
        .limit(1); // We only need to know if at least one exists

      if (ordersError) {
        // If checking orders fails, log it but proceed with caution or deny deletion
        console.error("Error checking for associated orders:", ordersError);
        toast({
          title: "Erreur lors de la vérification",
          description:
            "Impossible de vérifier les commandes associées. Suppression annulée par précaution.",
          variant: "destructive",
        });
        return;
      }

      if (orders && orders.length > 0) {
        toast({
          title: "Suppression impossible",
          description: `Le produit "${productName}" ne peut pas être supprimé car il est utilisé dans des commandes existantes.`,
          variant: "destructive",
        });
        return;
      }

      // If no orders are associated, proceed with deletion
      const { error: deleteError } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);

      if (deleteError) throw deleteError;

      toast({
        title: "Produit supprimé",
        description: `Le produit "${productName}" a été supprimé avec succès.`,
      });

      fetchProducts(); // Refresh products list
    } catch (error) {
      // This catch block will now primarily handle unexpected errors or the re-thrown deleteError
      console.error(
        `Error deleting product "${productName}" (ID: ${productId}):`,
        error
      );
      toast({
        title: "Erreur de suppression",
        description: `Impossible de supprimer le produit "${productName}". Vérifiez la console pour plus de détails.`,
        variant: "destructive",
      });
    }
  };

  const handleAddNewProduct = () => {
    setSelectedProduct(null);
    setIsDialogOpen(true);
  };

  const handleProductSuccess = () => {
    setIsDialogOpen(false);
    fetchProducts(); // Refresh products after add/edit
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Produits</h1>
        <Button
          onClick={handleAddNewProduct}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Nouveau Produit
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="search"
            placeholder="Rechercher un produit..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-10">
              Aucun produit trouvé
            </div>
          ) : (
            filteredProducts.map((product) => (
              <Card key={product.id}>
                <CardHeader>
                  <CardTitle className="truncate">{product.name}</CardTitle>
                  <CardDescription className="text-sm text-gray-500 h-10 truncate">
                    {product.process_steps.length} étapes
                    {product.description && ` • ${product.description}`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="flex flex-wrap gap-2">
                    {product.process_steps.map((step, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="bg-secondary/50"
                      >
                        {index + 1}. {step}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditProduct(product)}
                  >
                    <Edit className="h-4 w-4 mr-1" /> Modifier
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() =>
                      handleDeleteProduct(product.id, product.name)
                    }
                  >
                    <Trash className="h-4 w-4 mr-1" /> Supprimer
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedProduct
                ? "Modifier le Produit"
                : "Ajouter un Nouveau Produit"}
            </DialogTitle>
            <DialogDescription>
              {selectedProduct
                ? "Modifiez les informations du produit et son processus de fabrication."
                : "Définissez un nouveau produit et son processus de fabrication étape par étape."}
            </DialogDescription>
          </DialogHeader>
          <ProductForm
            product={selectedProduct}
            onSuccess={handleProductSuccess}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductsPage;
