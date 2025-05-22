import { useState, useEffect } from "react";
import "./App.css"; // Assuming you have some basic styles
import { supabase } from "./lib/supabaseClient";
import AuthComponent from "./components/auth/AuthComponent";
import { Session } from "@supabase/supabase-js";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./components/MainLayout";
import Dashboard from "./pages/Index";
import ClientsPage from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import ProductsPage from "./pages/Products";
import ProductFormPage from "./pages/ProductFormPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CreateOrder from "./pages/CreateOrder";
import OrderDetail from "./pages/OrderDetail";
import OrdersPage from "./pages/OrdersPage";
import NotFound from "./pages/NotFound";
import Demo from "./pages/Demo";
import { SupabaseProvider } from "./context/SupabaseContext";

const queryClient = new QueryClient();

// Dummy component to simulate displaying user-specific data
const UserDashboard: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productName, setProductName] = useState("");

  const fetchProducts = async () => {
    setLoadingProducts(true);
    const { data, error } = await supabase.from("products").select("*");
    if (error) {
      console.error("Error fetching products:", error.message);
      alert("Error fetching products: " + error.message);
    } else {
      setProducts(data || []);
    }
    setLoadingProducts(false);
  };

  const handleAddProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!productName.trim()) return;

    const { data, error } = await supabase
      .from("products")
      .insert([{ name: productName.trim() }])
      .select();

    if (error) {
      console.error("Error adding product:", error.message);
      alert("Error adding product: " + error.message);
    } else {
      if (data) {
        setProducts((currentProducts) => [...currentProducts, ...data]);
      }
      setProductName("");
      alert("Product added!");
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <div>
      <h3>Your Dashboard</h3>
      <form onSubmit={handleAddProduct} style={{ marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="New product name"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          style={{ marginRight: "10px", padding: "8px" }}
        />
        <button type="submit" style={{ padding: "8px 12px" }}>
          Add Product
        </button>
      </form>
      {loadingProducts ? (
        <p>Loading products...</p>
      ) : (
        <ul>
          {products.length > 0 ? (
            products.map((product) => (
              <li key={product.id}>
                {product.name} (ID: {product.id})
              </li>
            ))
          ) : (
            <p>No products found. Add one!</p>
          )}
        </ul>
      )}
    </div>
  );
};

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      setSession(currentSession);
      setLoading(false);
    };
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);
        setLoading(false);
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="container">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <SupabaseProvider>
            {!session ? (
              <AuthComponent />
            ) : (
              <Routes>
                <Route
                  path="/*"
                  element={
                    <>
                      <MainLayout session={session}>
                        <Routes>
                          <Route path="/" element={<Dashboard />} />
                          <Route path="/clients" element={<ClientsPage />} />
                          <Route
                            path="/clients/:id"
                            element={<ClientDetail />}
                          />
                          <Route path="/products" element={<ProductsPage />} />
                          <Route
                            path="/products/new"
                            element={<ProductFormPage />}
                          />
                          <Route
                            path="/products/edit/:id"
                            element={<ProductFormPage />}
                          />
                          <Route
                            path="/products/:id"
                            element={<ProductDetailPage />}
                          />
                          <Route
                            path="/orders/create"
                            element={<CreateOrder />}
                          />
                          <Route
                            path="/orders/edit/:id"
                            element={<CreateOrder />}
                          />
                          <Route path="/orders/:id" element={<OrderDetail />} />
                          <Route path="/orders" element={<OrdersPage />} />
                          <Route path="/demo" element={<Demo />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </MainLayout>
                    </>
                  }
                />
              </Routes>
            )}
            <Toaster />
            <Sonner />
          </SupabaseProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;
