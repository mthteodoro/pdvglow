"use client";

export const dynamic = "force-dynamic";

import Image from "next/image";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Edit, FileSpreadsheet, Package, Plus, RefreshCw, Save, Search, ShoppingBag, Trash2, TrendingUp, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { api, Cliente, Dashboard, ImportPreview, Movimento, Produto, Venda } from "@/services/api";

const dinheiro = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const emptyCliente = { nome: "", telefone: "", email: "", observacoes: "" };
const emptyProduto = { id: "", nome: "", quantidade: 0, preco: 0 };

type Tab = "clientes" | "estoque" | "vendas" | "financeiro";

export default function Home() {
  const [sessionReady, setSessionReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<Tab | null>(null);

  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);

  const [clienteForm, setClienteForm] = useState(emptyCliente);
  const [clienteEditId, setClienteEditId] = useState<string | null>(null);
  const [produtoForm, setProdutoForm] = useState(emptyProduto);
  const [produtoEditId, setProdutoEditId] = useState<string | null>(null);
  const [buscaCliente, setBuscaCliente] = useState("");
  const [buscaProduto, setBuscaProduto] = useState("");

  const [excelPreview, setExcelPreview] = useState<ImportPreview | null>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);

  const [vendaCliente, setVendaCliente] = useState("");
  const [vendaProduto, setVendaProduto] = useState("");
  const [vendaQuantidade, setVendaQuantidade] = useState(1);
  const [formaPagamento, setFormaPagamento] = useState("pix");
  const [carrinho, setCarrinho] = useState<Array<{ produto: Produto; quantidade: number }>>([]);

  const [financeiroForm, setFinanceiroForm] = useState({ tipo: "saida" as "entrada" | "saida", descricao: "", valor: 0 });

  const totalVenda = useMemo(
    () => carrinho.reduce((total, item) => total + Number(item.produto.preco) * item.quantidade, 0),
    [carrinho],
  );

  async function carregarDados() {
    setLoading(true);
    setMessage("");
    try {
      const requests: Promise<unknown>[] = [
        api.dashboard(),
        api.clientes.list(buscaCliente),
        api.produtos.list(buscaProduto),
        api.vendas.list(),
      ];
      if (isAdmin) requests.push(api.financeiro.list());

      const [dashboardData, clientesData, produtosData, vendasData, movimentosData] = await Promise.all(requests);
      setDashboard(dashboardData as Dashboard);
      setClientes(clientesData as Cliente[]);
      setProdutos(produtosData as Produto[]);
      setVendas(vendasData as Venda[]);
      if (isAdmin && movimentosData) setMovimentos(movimentosData as Movimento[]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      const admin = user?.app_metadata?.role === "admin";
      const name = user?.user_metadata?.name || user?.email?.split("@")[0] || "vendedora";
      setAuthenticated(Boolean(data.session));
      setIsAdmin(admin);
      setUserName(name);
      setSessionReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      setAuthenticated(Boolean(session));
      setIsAdmin(user?.app_metadata?.role === "admin");
      setUserName(user?.user_metadata?.name || user?.email?.split("@")[0] || "vendedora");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (authenticated) carregarDados();
  }, [authenticated, isAdmin]);

  async function login(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setMessage(error.message);
  }

  async function salvarCliente(event: FormEvent) {
    event.preventDefault();
    if (clienteEditId) await api.clientes.update(clienteEditId, clienteForm);
    else await api.clientes.create(clienteForm);
    setClienteForm(emptyCliente);
    setClienteEditId(null);
    await carregarDados();
  }

  async function salvarProduto(event: FormEvent) {
    event.preventDefault();
    if (produtoEditId) await api.produtos.update(produtoEditId, produtoForm);
    else await api.produtos.create(produtoForm);
    setProdutoForm(emptyProduto);
    setProdutoEditId(null);
    await carregarDados();
  }

  async function previewExcel() {
    if (!excelFile) return;
    setExcelPreview((await api.produtos.importExcel(excelFile, true)) as ImportPreview);
  }

  async function importarExcel() {
    if (!excelFile) return;
    await api.produtos.importExcel(excelFile);
    setExcelFile(null);
    setExcelPreview(null);
    await carregarDados();
  }

  function adicionarProdutoVenda() {
    const produto = produtos.find((item) => item.id === vendaProduto);
    if (!produto) return;
    setCarrinho((current) => {
      const existente = current.find((item) => item.produto.id === produto.id);
      if (existente) {
        return current.map((item) => (item.produto.id === produto.id ? { ...item, quantidade: item.quantidade + vendaQuantidade } : item));
      }
      return [...current, { produto, quantidade: vendaQuantidade }];
    });
    setVendaProduto("");
    setVendaQuantidade(1);
  }

  async function finalizarVenda() {
    await api.vendas.create({
      cliente_id: vendaCliente || undefined,
      forma_pagamento: formaPagamento,
      itens: carrinho.map((item) => ({ produto_id: item.produto.id, quantidade: item.quantidade })),
    });
    setCarrinho([]);
    setVendaCliente("");
    await carregarDados();
  }

  async function salvarMovimento(event: FormEvent) {
    event.preventDefault();
    await api.financeiro.create(financeiroForm);
    setFinanceiroForm({ tipo: "saida", descricao: "", valor: 0 });
    await carregarDados();
  }

  if (!sessionReady) return <main className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">Carregando...</p></main>;

  if (!authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-stone-800 via-zinc-800 to-neutral-900 p-4">
        <form onSubmit={login} className="w-full max-w-sm rounded-2xl bg-white/95 backdrop-blur-sm p-8 shadow-2xl">
          <div className="mb-6 flex flex-col items-center gap-2">
            <Image src="/glow-logo.jpeg" alt="Glow Clothings" width={160} height={107} className="rounded-xl object-cover shadow-md" priority />
            <p className="text-xs tracking-widest text-stone-400 uppercase">Sistema de Gestão</p>
          </div>
          <div className="space-y-3">
            <Input type="email" placeholder="E-mail" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <Input type="password" placeholder="Senha" value={password} onChange={(event) => setPassword(event.target.value)} required />
            <Button className="w-full bg-stone-800 hover:bg-stone-700 text-white" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</Button>
            {message && <p className="text-sm text-destructive">{message}</p>}
          </div>
        </form>
      </main>
    );
  }

  const navItems: { key: Tab; label: string; icon: ReactNode }[] = [
    { key: "clientes", label: "Clientes", icon: <Users size={18} /> },
    { key: "estoque", label: "Estoque", icon: <Package size={18} /> },
    { key: "vendas", label: "Vendas", icon: <ShoppingBag size={18} /> },
    ...(isAdmin ? [{ key: "financeiro" as Tab, label: "Financeiro", icon: <TrendingUp size={18} /> }] : []),
  ];

  return (
    <div className="flex min-h-screen bg-stone-50">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col border-r bg-white shadow-sm">
        <div className="flex flex-col items-center gap-2 border-b px-4 py-5">
          <Image src="/glow-logo.jpeg" alt="Glow Clothings" width={100} height={67} className="rounded-lg object-cover" priority />
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left w-full
                ${activeTab === item.key
                  ? "bg-stone-800 text-white"
                  : "text-stone-600 hover:bg-stone-100"
                }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
        <div className="border-t p-3 space-y-1">
          <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={carregarDados} disabled={loading}>
            <RefreshCw size={14} />Atualizar
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start text-stone-500" onClick={() => supabase.auth.signOut()}>
            Sair
          </Button>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl space-y-6 px-6 py-6">
          {message && <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{message}</div>}

          {/* Dashboard metrics */}
          <section className={`grid gap-3 ${isAdmin ? "md:grid-cols-5" : "md:grid-cols-3"}`}>
            <Metric title="Vendas do dia" value={dashboard?.vendas_do_dia ?? 0} />
            <Metric title="Clientes" value={dashboard?.clientes_cadastrados ?? 0} />
            <Metric title="Produtos" value={dashboard?.produtos_cadastrados ?? 0} />
            {isAdmin && <Metric title="Faturamento" value={dinheiro.format(Number(dashboard?.faturamento_do_dia ?? 0))} />}
            {isAdmin && <Metric title="Saldo" value={dinheiro.format(Number(dashboard?.saldo_financeiro ?? 0))} />}
          </section>

          {/* Boas-vindas */}
          {activeTab === null && (
            <div className="flex flex-col items-center pt-16 text-center">
              <h2 className="text-2xl font-semibold text-stone-800 mb-3">
                Um bom dia de trabalho, {userName}!
              </h2>
              <p className="text-stone-500 text-base max-w-sm leading-relaxed">
                Seu brilho é radiante, o glow é natural e vem de dentro.<br />Siga iluminando!
              </p>
              <p className="mt-8 text-xs text-stone-400 tracking-widest uppercase">Selecione uma opção no menu ao lado</p>
            </div>
          )}

          {/* Aba Clientes */}
          {activeTab === "clientes" && (
            <section className="grid gap-6 lg:grid-cols-[400px_1fr]">
              <Card>
                <CardHeader><CardTitle>Cadastro de Clientes</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={salvarCliente} className="grid gap-3">
                    <Field label="Nome"><Input value={clienteForm.nome} onChange={(e) => setClienteForm({ ...clienteForm, nome: e.target.value })} required /></Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Telefone"><Input value={clienteForm.telefone} onChange={(e) => setClienteForm({ ...clienteForm, telefone: e.target.value })} /></Field>
                      <Field label="Email"><Input type="email" value={clienteForm.email} onChange={(e) => setClienteForm({ ...clienteForm, email: e.target.value })} /></Field>
                    </div>
                    <Field label="Observações"><Textarea value={clienteForm.observacoes} onChange={(e) => setClienteForm({ ...clienteForm, observacoes: e.target.value })} /></Field>
                    <Button><Save size={16} />{clienteEditId ? "Salvar cliente" : "Criar cliente"}</Button>
                  </form>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Clientes</CardTitle></CardHeader>
                <CardContent>
                  <SearchBar value={buscaCliente} onChange={setBuscaCliente} onSearch={carregarDados} placeholder="Buscar cliente" />
                  <Table headers={["Nome", "Telefone", "Email", "Ações"]}>
                    {clientes.map((cliente) => (
                      <tr key={cliente.id}>
                        <td>{cliente.nome}</td><td>{cliente.telefone}</td><td>{cliente.email}</td>
                        <td className="flex gap-1">
                          <IconButton title="Editar" onClick={() => { setClienteEditId(cliente.id); setClienteForm({ nome: cliente.nome ?? "", telefone: cliente.telefone ?? "", email: cliente.email ?? "", observacoes: cliente.observacoes ?? "" }); }}><Edit size={16} /></IconButton>
                          <IconButton title="Excluir" onClick={async () => { await api.clientes.remove(cliente.id); await carregarDados(); }}><Trash2 size={16} /></IconButton>
                        </td>
                      </tr>
                    ))}
                  </Table>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Aba Estoque */}
          {activeTab === "estoque" && (
            <section className="grid gap-6 lg:grid-cols-[400px_1fr]">
              <Card>
                <CardHeader><CardTitle>Estoque</CardTitle></CardHeader>
                <CardContent className="space-y-5">
                  <form onSubmit={salvarProduto} className="grid gap-3">
                    <Field label="ID"><Input value={produtoForm.id} disabled={Boolean(produtoEditId)} onChange={(e) => setProdutoForm({ ...produtoForm, id: e.target.value })} required /></Field>
                    <Field label="Produto"><Input value={produtoForm.nome} onChange={(e) => setProdutoForm({ ...produtoForm, nome: e.target.value })} required /></Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Quantidade"><Input type="number" min={0} value={produtoForm.quantidade} onChange={(e) => setProdutoForm({ ...produtoForm, quantidade: Number(e.target.value) })} /></Field>
                      <Field label="Preço"><Input type="number" min={0} step="0.01" value={produtoForm.preco} onChange={(e) => setProdutoForm({ ...produtoForm, preco: Number(e.target.value) })} /></Field>
                    </div>
                    <Button><Save size={16} />{produtoEditId ? "Salvar produto" : "Criar produto"}</Button>
                  </form>
                  <div className="border-t pt-4">
                    <Field label="Importar Excel .xlsx">
                      <Input type="file" accept=".xlsx" onChange={(e) => setExcelFile(e.target.files?.[0] ?? null)} />
                    </Field>
                    <div className="mt-3 flex gap-2">
                      <Button type="button" variant="outline" onClick={previewExcel} disabled={!excelFile}><FileSpreadsheet size={16} />Preview</Button>
                      <Button type="button" onClick={importarExcel} disabled={!excelPreview}>Importar</Button>
                    </div>
                    {excelPreview && <p className="mt-2 text-sm text-muted-foreground">{excelPreview.validos} linhas válidas de {excelPreview.total_linhas}</p>}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Produtos</CardTitle></CardHeader>
                <CardContent>
                  <SearchBar value={buscaProduto} onChange={setBuscaProduto} onSearch={carregarDados} placeholder="Buscar produto" />
                  <Table headers={["ID", "Produto", "Qtd", "Preço", "Ações"]}>
                    {produtos.map((produto) => (
                      <tr key={produto.id}>
                        <td>{produto.id}</td><td>{produto.nome}</td><td>{produto.quantidade}</td><td>{dinheiro.format(Number(produto.preco))}</td>
                        <td className="flex gap-1">
                          <IconButton title="Editar" onClick={() => { setProdutoEditId(produto.id); setProdutoForm(produto); }}><Edit size={16} /></IconButton>
                          <IconButton title="Excluir" onClick={async () => { await api.produtos.remove(produto.id); await carregarDados(); }}><Trash2 size={16} /></IconButton>
                        </td>
                      </tr>
                    ))}
                  </Table>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Aba Vendas */}
          {activeTab === "vendas" && (
            <section className="grid gap-6 lg:grid-cols-[400px_1fr]">
              <Card>
                <CardHeader><CardTitle>Nova Venda</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Field label="Cliente">
                    <Select value={vendaCliente} onChange={(e) => setVendaCliente(e.target.value)}>
                      <option value="">Consumidor final</option>
                      {clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>)}
                    </Select>
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-[1fr_92px]">
                    <Field label="Produto">
                      <Select value={vendaProduto} onChange={(e) => setVendaProduto(e.target.value)}>
                        <option value="">Selecionar</option>
                        {produtos.map((produto) => <option key={produto.id} value={produto.id}>{produto.nome} - {produto.quantidade} un.</option>)}
                      </Select>
                    </Field>
                    <Field label="Qtd"><Input type="number" min={1} value={vendaQuantidade} onChange={(e) => setVendaQuantidade(Number(e.target.value))} /></Field>
                  </div>
                  <Button type="button" variant="secondary" onClick={adicionarProdutoVenda} disabled={!vendaProduto}><Plus size={16} />Adicionar</Button>
                  <Table headers={["Item", "Qtd", "Subtotal", ""]}>
                    {carrinho.map((item) => (
                      <tr key={item.produto.id}>
                        <td>{item.produto.nome}</td><td>{item.quantidade}</td><td>{dinheiro.format(Number(item.produto.preco) * item.quantidade)}</td>
                        <td><IconButton title="Remover" onClick={() => setCarrinho(carrinho.filter((cart) => cart.produto.id !== item.produto.id))}><Trash2 size={16} /></IconButton></td>
                      </tr>
                    ))}
                  </Table>
                  <Field label="Pagamento">
                    <Select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)}>
                      <option value="pix">Pix</option><option value="dinheiro">Dinheiro</option><option value="credito">Crédito</option><option value="debito">Débito</option>
                    </Select>
                  </Field>
                  <div className="flex items-center justify-between rounded-md border p-3 font-semibold">
                    <span>Total</span><span>{dinheiro.format(totalVenda)}</span>
                  </div>
                  <Button className="w-full" onClick={finalizarVenda} disabled={!carrinho.length}><ShoppingBag size={16} />Finalizar venda</Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Vendas Recentes</CardTitle></CardHeader>
                <CardContent>
                  <Table headers={["Data", "Pagamento", "Total"]}>
                    {vendas.slice(0, 10).map((venda) => (
                      <tr key={venda.id}><td>{new Date(venda.created_at).toLocaleString("pt-BR")}</td><td>{venda.forma_pagamento}</td><td>{dinheiro.format(Number(venda.total))}</td></tr>
                    ))}
                  </Table>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Aba Financeiro — somente admin */}
          {activeTab === "financeiro" && isAdmin && (
            <section className="grid gap-6 lg:grid-cols-[400px_1fr]">
              <Card>
                <CardHeader><CardTitle>Financeiro</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={salvarMovimento} className="grid gap-3">
                    <Field label="Tipo">
                      <Select value={financeiroForm.tipo} onChange={(e) => setFinanceiroForm({ ...financeiroForm, tipo: e.target.value as "entrada" | "saida" })}>
                        <option value="saida">Saída</option><option value="entrada">Entrada</option>
                      </Select>
                    </Field>
                    <Field label="Descrição"><Input value={financeiroForm.descricao} onChange={(e) => setFinanceiroForm({ ...financeiroForm, descricao: e.target.value })} required /></Field>
                    <Field label="Valor"><Input type="number" min={0.01} step="0.01" value={financeiroForm.valor} onChange={(e) => setFinanceiroForm({ ...financeiroForm, valor: Number(e.target.value) })} required /></Field>
                    <Button><Save size={16} />Registrar movimento</Button>
                  </form>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Movimentações</CardTitle></CardHeader>
                <CardContent>
                  <Table headers={["Data", "Tipo", "Descrição", "Valor"]}>
                    {movimentos.map((movimento) => (
                      <tr key={movimento.id}>
                        <td>{new Date(movimento.created_at).toLocaleString("pt-BR")}</td><td>{movimento.tipo}</td><td>{movimento.descricao}</td><td>{dinheiro.format(Number(movimento.valor))}</td>
                      </tr>
                    ))}
                  </Table>
                </CardContent>
              </Card>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="grid gap-1.5"><Label>{label}</Label>{children}</div>;
}

function SearchBar({ value, onChange, onSearch, placeholder }: { value: string; onChange: (value: string) => void; onSearch: () => void; placeholder: string }) {
  return (
    <div className="mb-3 flex gap-2">
      <Input placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
      <Button variant="outline" size="icon" onClick={onSearch} title="Buscar"><Search size={16} /></Button>
    </div>
  );
}

function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="bg-muted">
          <tr>{headers.map((header) => <th key={header} className="px-3 py-2 font-medium">{header}</th>)}</tr>
        </thead>
        <tbody className="[&_td]:border-t [&_td]:px-3 [&_td]:py-2">{children}</tbody>
      </table>
    </div>
  );
}

function IconButton({ title, children, onClick }: { title: string; children: ReactNode; onClick: () => void }) {
  return <Button type="button" variant="ghost" size="icon" title={title} onClick={onClick}>{children}</Button>;
}
