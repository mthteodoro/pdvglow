import { supabase } from "@/lib/supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const auth = await authHeaders();
  Object.entries(auth).forEach(([key, value]) => headers.set(key, value));

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Erro inesperado" }));
    throw new Error(error.detail || "Erro inesperado");
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export type Cliente = {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  observacoes?: string;
  created_at: string;
};

export type Produto = {
  id: string;
  nome: string;
  quantidade: number;
  preco: number;
  created_at: string;
  updated_at: string;
};

export type Movimento = {
  id: string;
  tipo: "entrada" | "saida";
  descricao: string;
  valor: number;
  venda_id?: string;
  created_at: string;
};

export type Dashboard = {
  vendas_do_dia: number;
  faturamento_do_dia: number;
  clientes_cadastrados: number;
  produtos_cadastrados: number;
  total_em_estoque: number;
  saldo_financeiro: number;
};

export type Venda = {
  id: string;
  cliente_id?: string;
  forma_pagamento: string;
  total: number;
  created_at: string;
  itens: Array<{
    id: string;
    produto_id: string;
    produto_nome: string;
    quantidade: number;
    preco_unitario: number;
    subtotal: number;
  }>;
};

export type ImportPreview = {
  total_linhas: number;
  validos: number;
  itens: Array<Produto & { status: string }>;
};

export const api = {
  clientes: {
    list: (busca = "") => request<Cliente[]>(`/clientes${busca ? `?busca=${encodeURIComponent(busca)}` : ""}`),
    create: (data: Partial<Cliente>) => request<Cliente>("/clientes", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Cliente>) => request<Cliente>(`/clientes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/clientes/${id}`, { method: "DELETE" }),
  },
  produtos: {
    list: (busca = "") => request<Produto[]>(`/produtos${busca ? `?busca=${encodeURIComponent(busca)}` : ""}`),
    create: (data: Partial<Produto>) => request<Produto>("/produtos", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Produto>) => request<Produto>(`/produtos/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/produtos/${id}`, { method: "DELETE" }),
    importExcel: (file: File, preview = false) => {
      const form = new FormData();
      form.append("file", file);
      return request<ImportPreview | Produto[]>(`/produtos/importar-excel?preview=${preview}`, { method: "POST", body: form });
    },
  },
  vendas: {
    list: () => request<Venda[]>("/vendas"),
    create: (data: { cliente_id?: string; forma_pagamento: string; itens: Array<{ produto_id: string; quantidade: number }> }) =>
      request<Venda>("/vendas", { method: "POST", body: JSON.stringify(data) }),
  },
  financeiro: {
    list: () => request<Movimento[]>("/financeiro"),
    create: (data: { tipo: "entrada" | "saida"; descricao: string; valor: number }) =>
      request<Movimento>("/financeiro", { method: "POST", body: JSON.stringify(data) }),
  },
  dashboard: () => request<Dashboard>("/dashboard"),
};
