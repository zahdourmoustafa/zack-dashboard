import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Calendar as CalendarIcon, PlusCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import ClientForm from "@/components/ClientForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface Client {
  id: string;
  full_name: string;
  email: string;
  phone: string;
}

interface Product {
  id: string;
  name: string;
  price?: number;
  description: string | null;
}

const CreateOrder = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [orderDate, setOrderDate] = useState<Date | undefined>(new Date());
  const [formData, setFormData] = useState<{
    client_id: string;
    notes: string;
    product_id: string;
    quantity: number;
  }>({
    client_id: "",
    notes: "",
    product_id: "",
    quantity: 1,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data: clientsData, error: clientsError } = await supabase
          .from("clients")
          .select("*");
        if (clientsError) throw clientsError;
        setClients(clientsData || []);

        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select("*");
        if (productsError) throw productsError;
        setProducts(productsData || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les données",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  const handleFormInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleClientSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, client_id: value }));
  };

  const handleProductSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, product_id: value }));
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const quantity = Math.max(1, Number(e.target.value));
    setFormData((prev) => ({ ...prev, quantity }));
  };

  const handleClientAdded = async () => {
    setIsDialogOpen(false);
    const { data, error } = await supabase.from("clients").select("*");
    if (error) {
      console.error("Error fetching clients:", error);
    } else {
      setClients(data || []);
    }
    toast({
      title: "Client ajouté",
      description: "Le nouveau client a été ajouté avec succès.",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.client_id ||
      !formData.product_id ||
      formData.quantity < 1 ||
      !orderDate
    ) {
      toast({
        title: "Erreur de validation",
        description:
          "Veuillez sélectionner un client, un produit, une date et une quantité valide.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    console.log("Form data to submit:", {
      client_id: formData.client_id,
      product_id: formData.product_id,
      quantity: formData.quantity,
      order_date: orderDate.toISOString(),
      notes: formData.notes,
      status: "en_attente",
      current_step_index: 0,
    });

    try {
      const orderPayload = {
        client_id: formData.client_id,
        product_id: formData.product_id,
        quantity: formData.quantity,
        order_date: orderDate.toISOString(),
        notes: formData.notes,
        status: "en_attente",
        current_step_index: 0,
      };

      const { data: newOrder, error: orderError } = await supabase
        .from("orders")
        .insert(orderPayload)
        .select()
        .single();

      if (orderError || !newOrder) {
        throw orderError || new Error("Failed to create order.");
      }

      toast({
        title: "Commande créée",
        description: "La commande a été créée avec succès.",
      });
      navigate("/");
    } catch (error) {
      console.error("Error creating order:", error);
      toast({
        title: "Erreur",
        description:
          "Une erreur est survenue lors de la création de la commande.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        className="mb-6 flex items-center gap-1"
        onClick={() => navigate("/")}
      >
        <ArrowLeft className="h-4 w-4" /> Retour au tableau de bord
      </Button>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Nouvelle Commande</CardTitle>
          <CardDescription>
            Créez une nouvelle commande en sélectionnant un client et un
            produit.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="client_id">Client</Label>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8">
                      Nouveau Client
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ajouter un Nouveau Client</DialogTitle>
                    </DialogHeader>
                    <ClientForm onSuccess={handleClientAdded} />
                  </DialogContent>
                </Dialog>
              </div>
              <Select
                onValueChange={handleClientSelectChange}
                value={formData.client_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Clients</SelectLabel>
                    {clients.length === 0 ? (
                      <SelectItem value="no-clients" disabled>
                        Aucun client disponible
                      </SelectItem>
                    ) : (
                      clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.full_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="order_date">Date de la Commande</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !orderDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {orderDate ? (
                      format(orderDate, "PPP")
                    ) : (
                      <span>Choisir une date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={orderDate}
                    onSelect={setOrderDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product_id">Produit</Label>
              <Select
                onValueChange={handleProductSelectChange}
                value={formData.product_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un produit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Produits</SelectLabel>
                    {products.length === 0 ? (
                      <SelectItem value="no-products" disabled>
                        Aucun produit disponible
                      </SelectItem>
                    ) : (
                      products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantité</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                value={formData.quantity}
                onChange={handleQuantityChange}
                min="1"
                placeholder="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optionnel)</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleFormInputChange}
                placeholder="Ajoutez des notes ou instructions spécifiques..."
                rows={3}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full"
            >
              {isSubmitting ? "Création en cours..." : "Créer la Commande"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default CreateOrder;
