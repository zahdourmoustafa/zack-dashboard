// Type definitions
export interface Client {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  created_at: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price?: number;
  process_steps: string[];
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id?: string;
  product_id: string;
  product?: Product;
  quantity: number;
  item_notes?: string;
  status?: "en_attente" | "en_cours" | "termine" | "reporte" | "annule";
  current_step_index?: number;
}

export interface OrderHistoryEntry {
  step: string;
  status: string;
  timestamp: string;
  notes?: string;
}

export interface Order {
  id: string;
  client_id: string;
  order_date: string;
  status: "en_attente" | "en_cours" | "termine" | "reporte" | "annule";
  notes?: string; // Overall notes for the order
  created_at: string;
  updated_at: string;
  current_step_index: number | null;
  is_priority?: boolean;
  clients?: Client;
  order_items: OrderItem[];
  history?: OrderHistoryEntry[];
}

// Mock data
export const mockClients: Client[] = [
  {
    id: "1",
    full_name: "Kamel Zouaoui",
    email: "kamel@example.com",
    phone: "123-456-7890",
    created_at: "2023-01-15T10:00:00Z",
    updated_at: "2023-01-15T10:00:00Z",
  },
  {
    id: "2",
    full_name: "Fatima Benali",
    phone: "+212 623456789",
    email: "fatima.benali@example.com",
    created_at: "2023-05-03T14:20:00Z",
  },
  {
    id: "3",
    full_name: "Ahmed Haddad",
    phone: "+212 634567890",
    email: "ahmed.haddad@example.com",
    created_at: "2023-05-04T09:15:00Z",
  },
  {
    id: "4",
    full_name: "Nadia Chraibi",
    phone: "+212 645678901",
    email: "nadia.chraibi@example.com",
    created_at: "2023-05-06T16:45:00Z",
  },
  {
    id: "5",
    full_name: "Youssef Mansouri",
    phone: "+212 656789012",
    email: "youssef.mansouri@example.com",
    created_at: "2023-05-10T11:00:00Z",
  },
];

export const mockProducts: Product[] = [
  {
    id: "1",
    name: "CDV Pellicule",
    description: "Cartes de visite avec pelliculage mat.",
    price: 50,
    process_steps: [
      "Préparation",
      "Impression",
      "Pelliculage",
      "Découpe",
      "Emballage",
    ],
    created_at: "2023-01-01T12:00:00Z",
    updated_at: "2023-01-01T12:00:00Z",
  },
  {
    id: "2",
    name: "Étiquette Piquée",
    description: "Étiquettes produits piquées.",
    price: 30,
    process_steps: ["Design", "Impression", "Découpe", "Piquage", "Emballage"],
    created_at: "2023-01-02T12:00:00Z",
    updated_at: "2023-01-02T12:00:00Z",
  },
  {
    id: "3",
    name: "Papier photo plastification",
    description: "Papier photo avec plastification brillante.",
    price: 70,
    process_steps: ["Conception", "Impression", "Plastification", "Découpe"],
    created_at: "2023-04-01T08:30:00Z",
    updated_at: "2023-04-01T08:30:00Z",
  },
  {
    id: "4",
    name: "Flyer",
    description: "Flyers publicitaires A5.",
    price: 40,
    process_steps: ["Conception", "Impression", "Découpe"],
    created_at: "2023-04-01T09:00:00Z",
    updated_at: "2023-04-01T09:00:00Z",
  },
  {
    id: "5",
    name: "Brochure Pliée",
    description: "Brochure A4 pliée en 3 volets.",
    price: 120,
    process_steps: [
      "Maquette",
      "Impression",
      "Pliage",
      "Finition",
      "Emballage",
    ],
    created_at: "2023-04-05T10:00:00Z",
    updated_at: "2023-04-05T10:00:00Z",
  },
];

export const mockOrders: Order[] = [
  {
    id: "1",
    client_id: "1",
    order_date: "2023-05-15T09:30:00Z",
    status: "en_attente",
    created_at: "2023-05-15T09:30:00Z",
    updated_at: "2023-05-15T09:30:00Z",
    current_step_index: 0,
    clients: mockClients[0],
    order_items: [
      {
        id: "oi1",
        product_id: "1",
        product: mockProducts[0],
        quantity: 100,
        item_notes: "Logo en haut à gauche",
      },
    ],
    history: [
      {
        step: "Création",
        status: "en_attente",
        timestamp: "2023-05-15T09:30:00Z",
      },
    ],
    notes: "Commande urgente",
  },
  {
    id: "2",
    client_id: "2",
    order_date: "2023-05-14T11:20:00Z",
    status: "en_cours",
    created_at: "2023-05-14T11:20:00Z",
    updated_at: "2023-05-16T10:15:00Z",
    current_step_index: 1,
    clients: mockClients[1],
    order_items: [
      {
        id: "oi2",
        product_id: "2",
        product: mockProducts[1],
        quantity: 50,
      },
      {
        id: "oi3",
        product_id: "1", // Same order can have multiple products
        product: mockProducts[0],
        quantity: 200,
        item_notes: "Qualité standard",
      },
    ],
    history: [
      {
        step: "Création",
        status: "en_attente",
        timestamp: "2023-05-14T11:20:00Z",
      },
      {
        step: "Préparation",
        status: "en_cours",
        timestamp: "2023-05-16T10:15:00Z",
      },
    ],
  },
  {
    id: "3",
    client_id: "3",
    order_date: "2023-05-12T14:45:00Z",
    status: "en_cours",
    created_at: "2023-05-12T14:45:00Z",
    updated_at: "2023-05-18T09:00:00Z",
    current_step_index: 2,
    clients: mockClients[2],
    order_items: [
      {
        id: "3",
        product_id: "3",
        product: mockProducts[2],
        quantity: 1,
      },
    ],
    history: [
      {
        step: "Création",
        status: "en_attente",
        timestamp: "2023-05-12T14:45:00Z",
      },
      {
        step: "Conception",
        status: "en_cours",
        timestamp: "2023-05-14T16:30:00Z",
      },
      {
        step: "Impression",
        status: "en_cours",
        timestamp: "2023-05-18T09:00:00Z",
      },
    ],
  },
  {
    id: "4",
    client_id: "4",
    order_date: "2023-05-10T10:00:00Z",
    status: "termine",
    created_at: "2023-05-10T10:00:00Z",
    updated_at: "2023-05-17T15:30:00Z",
    current_step_index: 4,
    clients: mockClients[3],
    order_items: [
      {
        id: "4",
        product_id: "4",
        product: mockProducts[3],
        quantity: 1,
      },
    ],
    history: [
      {
        step: "Création",
        status: "en_attente",
        timestamp: "2023-05-10T10:00:00Z",
      },
      {
        step: "Conception",
        status: "en_cours",
        timestamp: "2023-05-11T11:00:00Z",
      },
      {
        step: "Impression",
        status: "en_cours",
        timestamp: "2023-05-13T14:20:00Z",
      },
      {
        step: "Plastification",
        status: "en_cours",
        timestamp: "2023-05-15T09:45:00Z",
      },
      {
        step: "Découpe",
        status: "termine",
        timestamp: "2023-05-17T15:30:00Z",
      },
    ],
  },
  {
    id: "5",
    client_id: "5",
    order_date: "2023-05-13T13:15:00Z",
    status: "reporte",
    created_at: "2023-05-13T13:15:00Z",
    updated_at: "2023-05-14T09:30:00Z",
    current_step_index: 0,
    clients: mockClients[4],
    order_items: [
      {
        id: "oi5",
        product_id: "5",
        product: mockProducts.find((p) => p.id === "5"),
        quantity: 150,
        item_notes: "Papier couché brillant 170g",
      },
    ],
    notes: "Client a demandé de reporter - attente de validation du design",
    history: [
      {
        step: "Création",
        status: "en_attente",
        timestamp: "2023-05-13T13:15:00Z",
      },
      {
        step: "Reporté",
        status: "reporte",
        timestamp: "2023-05-14T09:30:00Z",
      },
    ],
  },
];

// Helper functions
export function getClientById(id: string): Client | undefined {
  return mockClients.find((client) => client.id === id);
}

export function getProductById(id: string): Product | undefined {
  return mockProducts.find((product) => product.id === id);
}

export function getOrdersByClientId(clientId: string): Order[] {
  return mockOrders.filter((order) => order.client_id === clientId);
}

// Get the status badge color based on the status
export function getStatusColor(status: string): string {
  switch (status) {
    case "en_attente":
      return "bg-yellow-100 text-yellow-700 border-yellow-300";
    case "en_cours":
      return "bg-blue-100 text-blue-700 border-blue-300";
    case "termine":
      return "bg-green-100 text-green-700 border-green-300";
    case "reporte":
      return "bg-orange-100 text-orange-700 border-orange-300";
    case "annule":
      return "bg-red-100 text-red-700 border-red-300";
    default:
      return "bg-gray-100 text-gray-700 border-gray-300";
  }
}

// Convert status to French display text
export function getStatusText(status: string): string {
  const statusMap = {
    en_attente: "En attente",
    en_cours: "En cours",
    termine: "Terminé",
    reporte: "Reporté",
    annule: "Annulé",
  };
  return statusMap[status] || "Inconnu";
}
