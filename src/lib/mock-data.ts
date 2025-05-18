// Type definitions
export interface Client {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  price?: number;
  description?: string | null;
  process_steps: string[];
  created_at: string;
  updated_at?: string;
}

export interface Order {
  id: string;
  client_id: string;
  product_id?: string;
  quantity?: number;
  current_step_index: number;
  status: "en_attente" | "en_cours" | "reporte" | "annule" | "termine";
  created_at: string;
  updated_at: string;
  order_date: string;
  notes?: string;
  history?: {
    step: string;
    status: string;
    timestamp: string;
  }[];

  // Relationships
  clients?: Client;
  products?: Product;
}

// Mock data
export const mockClients: Client[] = [
  {
    id: "1",
    full_name: "Mohammed Alami",
    phone: "+212 612345678",
    email: "mohammed.alami@example.com",
    created_at: "2023-05-01T10:30:00Z",
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
    name: "Papier photo",
    process_steps: ["Conception", "Impression", "Découpe"],
    created_at: "2023-04-01T08:00:00Z",
  },
  {
    id: "2",
    name: "Papier photo pellicule",
    process_steps: ["Conception", "Impression", "Pelliculage", "Découpe"],
    created_at: "2023-04-01T08:15:00Z",
  },
  {
    id: "3",
    name: "Papier photo plastification",
    process_steps: ["Conception", "Impression", "Plastification", "Découpe"],
    created_at: "2023-04-01T08:30:00Z",
  },
  {
    id: "4",
    name: "Flyer",
    process_steps: ["Conception", "Impression", "Découpe"],
    created_at: "2023-04-01T09:00:00Z",
  },
];

export const mockOrders: Order[] = [
  {
    id: "1",
    client_id: "1",
    product_id: "1",
    quantity: 1,
    current_step_index: 0,
    status: "en_attente",
    created_at: "2023-05-15T09:30:00Z",
    updated_at: "2023-05-15T09:30:00Z",
    order_date: "2023-05-15T09:30:00Z",
    history: [
      {
        step: "Création",
        status: "en_attente",
        timestamp: "2023-05-15T09:30:00Z",
      },
    ],
  },
  {
    id: "2",
    client_id: "2",
    product_id: "2",
    quantity: 1,
    current_step_index: 1,
    status: "en_cours",
    created_at: "2023-05-14T11:20:00Z",
    updated_at: "2023-05-16T10:15:00Z",
    order_date: "2023-05-14T11:20:00Z",
    history: [
      {
        step: "Création",
        status: "en_attente",
        timestamp: "2023-05-14T11:20:00Z",
      },
      {
        step: "Conception",
        status: "en_cours",
        timestamp: "2023-05-16T10:15:00Z",
      },
    ],
  },
  {
    id: "3",
    client_id: "3",
    product_id: "3",
    quantity: 1,
    current_step_index: 2,
    status: "en_cours",
    created_at: "2023-05-12T14:45:00Z",
    updated_at: "2023-05-18T09:00:00Z",
    order_date: "2023-05-12T14:45:00Z",
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
    product_id: "4",
    quantity: 1,
    current_step_index: 4,
    status: "termine",
    created_at: "2023-05-10T10:00:00Z",
    updated_at: "2023-05-17T15:30:00Z",
    order_date: "2023-05-10T10:00:00Z",
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
    product_id: "5",
    quantity: 1,
    current_step_index: 0,
    status: "reporte",
    created_at: "2023-05-13T13:15:00Z",
    updated_at: "2023-05-14T09:30:00Z",
    order_date: "2023-05-13T13:15:00Z",
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
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "en_cours":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "termine":
      return "bg-green-100 text-green-800 border-green-200";
    case "reporte":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "annule":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

// Convert status to French display text
export function getStatusText(status: string): string {
  switch (status) {
    case "en_attente":
      return "En attente";
    case "en_cours":
      return "En cours";
    case "termine":
      return "Terminé";
    case "reporte":
      return "Reporté";
    case "annule":
      return "Annulé";
    default:
      return status;
  }
}
