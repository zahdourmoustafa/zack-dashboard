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
import { Search, Plus, Edit, Trash, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ProductForm from "@/components/ProductForm";
import { useToast } from "@/hooks/use-toast";
import { useSupabase } from "@/context/SupabaseContext";
import { useNavigate } from "react-router-dom";
// import { PostgrestError } from "@supabase/supabase-js"; // Commenting out as we'll try a generic Error

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
  const { supabase } = useSupabase();
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const navigate = useNavigate();

  // Helper function to check for orders associated with a product
  // const checkProductInOrders = async (
  //   productId: string
  // ): Promise<{ data: { id: string }[] | null; error: Error | null }> => {
  //   const query = supabase
  //     .from("orders")
  //     .select("id")
  //     .eq("product_id", productId)
  //     .limit(1);
  //   const { data, error }: { data: { id: string }[] | null; error: Error | null } = await query;
  //
  //   return { data, error };
  // };

  // Fetch products from Supabase
  const fetchProducts = async () => {
    if (!supabase) return;
    setIsLoadingPage(true);
    try {
      // RLS ensures only user's products are fetched.
      // user_id is automatically handled by Supabase based on the JWT.
      const { data, error } = await supabase.from("products").select("*");

      if (error) throw error;

      const productsWithEnsuredSteps = (data || []).map((product) => ({
        ...product,
        process_steps: product.process_steps || [],
        description: product.description || null,
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
      setIsLoadingPage(false);
    }
  };

  // Initial load
  useEffect(() => {
    // Supabase client should be available, fetch products
    if (supabase) {
      fetchProducts();
    }
  }, [supabase]);

  // Filter products based on search query
  useEffect(() => {
    const filtered = products.filter((product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    // Sort the filtered products alphabetically by name
    const sortedAndFiltered = filtered.sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    setFilteredProducts(sortedAndFiltered);
  }, [searchQuery, products]);

  const handleEditProduct = (product: Product) => {
    navigate(`/products/edit/${product.id}`);
  };

  const handleCloneProduct = async (productIdToClone: string) => {
    if (!supabase) return;

    try {
      setIsLoadingPage(true); // Reuse existing loading state or add a specific one

      // 1. Fetch the original product
      const { data: originalProduct, error: fetchError } = await supabase
        .from("products")
        .select("*")
        .eq("id", productIdToClone)
        .single();

      if (fetchError) throw fetchError;
      if (!originalProduct) {
        toast({
          title: "Erreur",
          description: "Produit original non trouvé.",
          variant: "destructive",
        });
        return;
      }

      // 2. Prepare the new product data
      const clonedProductData = {
        name: `Copie de ${originalProduct.name}`,
        description: originalProduct.description,
        process_steps: originalProduct.process_steps || [], // Ensure process_steps is an array
        // user_id will be set by RLS/default if applicable
        // created_at and updated_at will be set by Supabase default or here
      };

      // 3. Insert the new product
      const { error: insertError } = await supabase
        .from("products")
        .insert(clonedProductData);

      if (insertError) throw insertError;

      toast({
        title: "Produit Cloné",
        description: `Le produit "${originalProduct.name}" a été cloné avec succès.`,
      });

      // 4. Refresh the products list
      fetchProducts(); // This will re-fetch and re-sort
    } catch (error: any) {
      console.error("Error cloning product:", error);
      toast({
        title: "Erreur de Clonage",
        description: error.message || "Impossible de cloner le produit.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPage(false);
    }
  };

  const handleDeleteProduct = async (
    productId: string,
    productName: string
  ) => {
    if (!supabase) return;
    try {
      // No need to check for associated orders here, RLS handles user scope.
      // If referential integrity is set up in DB (e.g. product_id in order_items cannot be null),
      // Supabase will prevent deletion if product is in use.
      const { error: deleteError } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);

      if (deleteError) throw deleteError;

      toast({
        title: "Produit supprimé",
        description: `Le produit "${productName}" a été supprimé avec succès.`,
      });

      fetchProducts();
    } catch (error: any) {
      console.error(
        `Error deleting product "${productName}" (ID: ${productId}):`,
        error
      );
      toast({
        title: "Erreur de suppression",
        description:
          error.message ||
          `Impossible de supprimer le produit "${productName}".`,
        variant: "destructive",
      });
    }
  };

  const handleAddNewProduct = () => {
    navigate("/products/new");
  };

  const handleProductSuccess = () => {
    fetchProducts();
    navigate("/products");
  };

  // Display loading indicator if Clerk/Supabase is initializing or products are fetching
  if (isLoadingPage) {
    return (
      <div className="container mx-auto px-4 py-8 bg-white min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brandSecondary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 bg-white min-h-screen">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4 sm:gap-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-brandPrimary">
          Produits
        </h1>
        <Button
          onClick={handleAddNewProduct}
          className="flex items-center gap-2 bg-brandSecondary hover:bg-yellow-400 text-brandPrimary font-semibold"
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full text-center py-10 text-slate-500">
            Aucun produit trouvé. Créez votre premier produit !
          </div>
        ) : (
          filteredProducts.map((product) => (
            <Card
              key={product.id}
              className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-200 cursor-pointer"
              onClick={() => navigate(`/products/${product.id}`)}
            >
              <CardHeader>
                <CardTitle className="truncate text-brandPrimary">
                  {product.name}
                </CardTitle>
                <CardDescription className="text-sm text-slate-600 h-10 truncate">
                  {product.process_steps.length} étape(s)
                  {product.description && ` • ${product.description}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="flex flex-wrap gap-2">
                  {product.process_steps.map((step, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="bg-yellow-100 text-yellow-800 border-yellow-300"
                    >
                      {index + 1}. {step}
                    </Badge>
                  ))}
                </div>
                {product.process_steps.length === 0 && (
                  <p className="text-xs text-slate-400">
                    Aucune étape définie.
                  </p>
                )}
              </CardContent>
              <CardFooter className="flex justify-between items-center mt-auto pt-4">
                {/* Left side: Modifier and Cloner buttons stacked vertically */}
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditProduct(product);
                    }}
                    className="border-brandPrimary text-brandPrimary hover:bg-brandPrimary hover:text-slate-50 w-full"
                    // Added w-full to make them take the same width within their vertical stack
                  >
                    <Edit className="h-4 w-4 mr-1" /> Modifier
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloneProduct(product.id);
                    }}
                    className="border-sky-500 text-sky-600 hover:bg-sky-500 hover:text-slate-50 w-full"
                    aria-label="Cloner le produit"
                  >
                    <Copy className="h-4 w-4 mr-1" /> Cloner
                  </Button>
                </div>

                {/* Right side: Supprimer button */}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteProduct(product.id, product.name);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-slate-50 self-end"
                  // Added self-end to try and align it better if heights differ, or remove if not needed
                >
                  <Trash className="h-4 w-4 mr-1" /> Supprimer
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ProductsPage;
