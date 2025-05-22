import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import {
  OrderItem as DataOrderItem,
  Client as ClientType,
  Product as ProductType,
} from "@/lib/mock-data";
import { fr } from "date-fns/locale";

interface Client extends ClientType {}
interface Product extends ProductType {}

interface FormOrderItem {
  product_id: string;
  quantity: number;
  item_notes: string;
  temp_id?: string;
  id?: string;
}

const CreateOrder = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { id: orderIdFromParams } = useParams<{ id: string }>();
  const isEditMode = Boolean(orderIdFromParams);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [orderDate, setOrderDate] = useState<Date | undefined>(new Date());
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [orderNotes, setOrderNotes] = useState<string>("");
  const [orderItems, setOrderItems] = useState<FormOrderItem[]>([
    {
      product_id: "",
      quantity: 1,
      item_notes: "",
      temp_id: Date.now().toString(),
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageTitle, setPageTitle] = useState("Créer une Nouvelle Commande");
  const [submitButtonText, setSubmitButtonText] = useState("Créer la Commande");

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

        if (isEditMode && orderIdFromParams) {
          setPageTitle("Modifier la Commande");
          setSubmitButtonText("Enregistrer les Modifications");

          const { data: existingOrderData, error: orderError } = await supabase
            .from("orders")
            .select(
              `
              *,
              order_items (
                id,
                product_id,
                quantity,
                item_notes
              )
            `
            )
            .eq("id", orderIdFromParams)
            .single();

          if (orderError) {
            toast({
              title: "Erreur",
              description: "Commande non trouvée ou non autorisée.",
              variant: "destructive",
            });
            navigate("/orders");
            return;
          }

          if (existingOrderData) {
            setSelectedClientId(existingOrderData.client_id || "");
            setOrderDate(
              existingOrderData.order_date
                ? new Date(existingOrderData.order_date)
                : new Date()
            );
            setOrderNotes(existingOrderData.notes || "");
            const fetchedOrderItems = (existingOrderData.order_items || []).map(
              (item: any) => ({
                ...item,
                quantity: item.quantity || 1,
                item_notes: item.item_notes || "",
              })
            );
            setOrderItems(
              fetchedOrderItems.length > 0
                ? fetchedOrderItems
                : [
                    {
                      product_id: "",
                      quantity: 1,
                      item_notes: "",
                      temp_id: Date.now().toString(),
                    },
                  ]
            );
          }
        } else {
          setPageTitle("Créer une Nouvelle Commande");
          setSubmitButtonText("Créer la Commande");
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les données nécessaires.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [toast, navigate, orderIdFromParams, isEditMode]);

  const handleClientSelectChange = (value: string) => {
    setSelectedClientId(value);
  };

  const addOrderItem = () => {
    setOrderItems([
      ...orderItems,
      {
        product_id: "",
        quantity: 1,
        item_notes: "",
        temp_id: Date.now().toString(),
      },
    ]);
  };

  const removeOrderItem = (index: number) => {
    if (orderItems.length <= 1 && !isEditMode) {
      toast({
        title: "Action non autorisée",
        description: "Vous devez avoir au moins un produit dans la commande.",
        variant: "destructive",
      });
      return;
    }
    const newItems = orderItems.filter((_, i) => i !== index);
    setOrderItems(newItems);
  };

  const handleOrderItemChange = (
    index: number,
    field: keyof FormOrderItem,
    value: string | number
  ) => {
    const newItems = [...orderItems];
    (newItems[index] as any)[field] =
      field === "quantity" ? Math.max(1, Number(value)) : value;
    setOrderItems(newItems);
  };

  const handleClientAdded = async () => {
    setIsDialogOpen(false);
    const { data, error } = await supabase
      .from("clients")
      .select<"*", Client>("*");
    if (error) {
      console.error("Error fetching clients:", error);
      toast({
        title: "Erreur",
        description: "Impossible de rafraîchir la liste des clients.",
        variant: "destructive",
      });
    } else {
      setClients(data || []);
    }
    toast({
      title: "Client ajouté",
      description:
        "Le nouveau client a été ajouté avec succès. Veuillez le sélectionner dans la liste.",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !selectedClientId ||
      orderItems.some((item) => !item.product_id || item.quantity < 1) ||
      !orderDate
    ) {
      toast({
        title: "Erreur de validation",
        description:
          "Veuillez sélectionner un client, une date, et vous assurer que chaque produit a une quantité valide.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: "Erreur d'authentification",
        description: "Utilisateur non authentifié. Veuillez vous connecter.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }
    const userId = user.id;

    const orderPayload = {
      client_id: selectedClientId,
      order_date: orderDate.toISOString(),
      notes: orderNotes,
      user_id: userId,
    };

    try {
      if (isEditMode && orderIdFromParams) {
        const { error: orderUpdateError } = await supabase
          .from("orders")
          .update({ ...orderPayload, updated_at: new Date().toISOString() })
          .eq("id", orderIdFromParams);

        if (orderUpdateError) throw orderUpdateError;

        const { data: existingDbItemsData, error: fetchExistingError } =
          await supabase
            .from("order_items")
            .select("id")
            .eq("order_id", orderIdFromParams);

        if (fetchExistingError) throw fetchExistingError;
        const existingDbItemIds =
          existingDbItemsData?.map((item) => item.id) || [];

        const itemsToUpdate = orderItems.filter(
          (item) => item.id && existingDbItemIds.includes(item.id)
        );
        const itemsToAdd = orderItems.filter((item) => !item.id);
        const itemIdsInForm = orderItems
          .map((item) => item.id)
          .filter((id) => id);
        const itemsToDeleteIds = existingDbItemIds.filter(
          (id) => !itemIdsInForm.includes(id)
        );

        if (itemsToDeleteIds.length > 0) {
          const { error: deleteError } = await supabase
            .from("order_items")
            .delete()
            .in("id", itemsToDeleteIds);
          if (deleteError) throw deleteError;
        }

        for (const item of itemsToUpdate) {
          const { error: updateItemError } = await supabase
            .from("order_items")
            .update({
              product_id: item.product_id,
              quantity: item.quantity,
              item_notes: item.item_notes,
              updated_at: new Date().toISOString(),
            })
            .eq("id", item.id!);
          if (updateItemError) throw updateItemError;
        }

        if (itemsToAdd.length > 0) {
          const newItemsPayload = itemsToAdd.map((item) => ({
            order_id: orderIdFromParams,
            product_id: item.product_id,
            quantity: item.quantity,
            item_notes: item.item_notes,
          }));
          const { error: addItemError } = await supabase
            .from("order_items")
            .insert(newItemsPayload);
          if (addItemError) throw addItemError;
        }

        toast({
          title: "Commande modifiée",
          description: "La commande a été mise à jour avec succès.",
        });
        navigate(`/orders/${orderIdFromParams}`);
      } else {
        const { data: newOrder, error: orderError } = await supabase
          .from("orders")
          .insert({
            ...orderPayload,
            status: "en_attente",
            current_step_index: 0,
          })
          .select()
          .single();

        if (orderError || !newOrder) {
          throw (
            orderError ||
            new Error("Échec de la création de la commande principale.")
          );
        }

        const orderItemsPayload = orderItems.map((item) => ({
          order_id: newOrder.id,
          product_id: item.product_id,
          quantity: item.quantity,
          item_notes: item.item_notes,
        }));

        const { error: itemsError } = await supabase
          .from("order_items")
          .insert(orderItemsPayload);

        if (itemsError) {
          await supabase.from("orders").delete().eq("id", newOrder.id);
          throw itemsError;
        }

        toast({
          title: "Commande créée",
          description: "La commande et ses produits ont été créés avec succès.",
        });
        navigate(`/orders/${newOrder.id}`);
      }
    } catch (error) {
      console.error("Error submitting order:", error);
      toast({
        title: "Erreur",
        description: isEditMode
          ? "Impossible de modifier la commande."
          : "Impossible de créer la commande.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center h-[60vh] bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brandSecondary mx-auto"></div>
          <p className="mt-4 text-brandPrimary">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto px-4 py-8 bg-white min-h-screen">
        <Button
          onClick={() =>
            navigate(isEditMode ? `/orders/${orderIdFromParams}` : "/orders")
          }
          className="bg-slate-800 text-slate-50 hover:bg-slate-700 px-3 py-1.5 text-sm rounded-md shadow-md "
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Retour
        </Button>
        <Card className="max-w-4xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl font-bold text-brandPrimary">
              {pageTitle}
            </CardTitle>
            <CardDescription>
              {isEditMode
                ? "Modifiez les détails de cette commande."
                : "Remplissez les informations ci-dessous pour créer une nouvelle commande."}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
                  <Label htmlFor="client_id" className="text-slate-700">
                    Client
                  </Label>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="flex items-center gap-1 bg-brandSecondary hover:bg-yellow-400 text-brandPrimary font-semibold text-xs px-2 py-1 h-auto">
                        <PlusCircle size={14} className="mr-1" /> Nouveau Client
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
                  value={selectedClientId}
                  required
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
                <Label htmlFor="order_date" className="text-slate-700">
                  Date de la Commande
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal border-gray-300 focus:border-brandPrimary focus:ring-brandPrimary",
                        !orderDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {orderDate ? (
                        format(orderDate, "PPP", { locale: fr })
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

              <div className="space-y-4">
                <Label className="text-slate-700 font-semibold">
                  Produits de la Commande
                </Label>
                {orderItems.map((item, index) => (
                  <Card
                    key={item.temp_id || index}
                    className="p-4 space-y-3 bg-slate-50/50 relative"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label
                          htmlFor={`product_id_${index}`}
                          className="text-xs text-slate-600"
                        >
                          Produit
                        </Label>
                        <Select
                          onValueChange={(value) =>
                            handleOrderItemChange(index, "product_id", value)
                          }
                          value={item.product_id}
                          required
                        >
                          <SelectTrigger
                            id={`product_id_${index}`}
                            className="w-full border-gray-300 focus:border-brandPrimary focus:ring-brandPrimary bg-white"
                          >
                            <SelectValue placeholder="Sélectionner un produit" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>Produits</SelectLabel>
                              {products.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label
                          htmlFor={`quantity_${index}`}
                          className="text-xs text-slate-600"
                        >
                          Quantité
                        </Label>
                        <Input
                          id={`quantity_${index}`}
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            handleOrderItemChange(
                              index,
                              "quantity",
                              e.target.value
                            )
                          }
                          min="1"
                          required
                          className="border-gray-300 focus:border-brandPrimary focus:ring-brandPrimary bg-white"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label
                        htmlFor={`item_notes_${index}`}
                        className="text-xs text-slate-600"
                      >
                        Notes pour ce produit (optionnel)
                      </Label>
                      <Textarea
                        id={`item_notes_${index}`}
                        value={item.item_notes}
                        onChange={(e) =>
                          handleOrderItemChange(
                            index,
                            "item_notes",
                            e.target.value
                          )
                        }
                        placeholder="Notes spécifiques au produit..."
                        className="min-h-[60px] border-gray-300 focus:border-brandPrimary focus:ring-brandPrimary bg-white text-sm"
                      />
                    </div>
                    {orderItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOrderItem(index)}
                        className="absolute top-1 right-1 text-red-500 hover:text-red-700 p-1 h-auto"
                        aria-label="Supprimer produit"
                      >
                        <XCircle size={16} />
                      </Button>
                    )}
                  </Card>
                ))}
                <Button
                  type="button"
                  onClick={addOrderItem}
                  variant="outline"
                  className="w-full flex items-center gap-2 border-brandPrimary text-brandPrimary hover:bg-brandPrimary hover:text-slate-50"
                >
                  <PlusCircle size={16} /> Ajouter un autre produit
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="orderNotes" className="text-slate-700">
                  Notes Générales pour la Commande (optionnel)
                </Label>
                <Textarea
                  id="orderNotes"
                  name="orderNotes"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Ajoutez des notes ou instructions générales pour toute la commande..."
                  className="min-h-[100px] border-gray-300 focus:border-brandPrimary focus:ring-brandPrimary"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="w-full bg-brandSecondary hover:bg-yellow-400 text-brandPrimary font-semibold"
              >
                {isSubmitting
                  ? isEditMode
                    ? "Enregistrement..."
                    : "Création en cours..."
                  : submitButtonText}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </>
  );
};

export default CreateOrder;
