"use client";

import Image from "next/image";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Edit, FileSpreadsheet, Plus, RefreshCw, Save, Search, ShoppingBag, Trash2 } from "lucide-react";

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

export default function Home() {
  const [sessionReady, setSessionReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

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
      const [dashboardData, clientesData, produtosData, movimentosData, vendasData] = await Promise.all([
        api.dashboard(),
        api.clientes.list(buscaCliente),
        api.produtos.list(buscaProduto),
        api.financeiro.list(),
        api.vendas.list(),
      ]);
      setDashboard(dashboardData);
      setClientes(clientesData);
      setProdutos(produtosData);
      setMovimentos(movimentosData);
      setVendas(vendasData);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthenticated(Boolean(data.session));
      setSessionReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setAuthenticated(Boolean(session)));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (authenticated) carregarDados();
  }, [authenticated]);

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

  if (!sessionReady) return <main className="p-8">Carregando...</main>;

  if (!authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
        <form onSubmit={login} className="w-full max-w-sm rounded-lg border border-zinc-800 bg-white p-5 shadow-xl">
          <div className="mb-5 flex justify-center">
            <Image src="/glow-logo.jpeg" alt="Glow Clothings" width={180} height={120} className="rounded-md object-cover" priority />
          </div>
          <div className="space-y-3">
            <Input type="email" placeholder="email@glow.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <Input type="password" placeholder="Senha" value={password} onChange={(event) => setPassword(event.target.value)} required />
            <Button className="w-full" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</Button>
            {message && <p className="text-sm text-destructive">{message}</p>}
          </div>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Image src="/glow-logo.jpeg" alt="Glow Clothings" width={82} height={54} className="h-12 w-20 rounded-md object-cover" priority />
            <div>
              <h1 className="text-xl font-semibold">Glow Clothings</h1>
              <p className="text-sm text-muted-foreground">PDV Web</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={carregarDados} disabled={loading}><RefreshCw size={16} />Atualizar</Button>
            <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}>Sair</Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        {message && <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{message}</div>}

        <section className="grid gap-3 md:grid-cols-5">
          <Metric title="Vendas do dia" value={dashboard?.vendas_do_dia ?? 0} />
          <Metric title="Faturamento" value={dinheiro.format(Number(dashboard?.faturamento_do_dia ?? 0))} />
          <Metric title="Clientes" value={dashboard?.clientes_cadastrados ?? 0} />
          <Metric title="Produtos" value={dashboard?.produtos_cadastrados ?? 0} />
          <Metric title="Saldo" value={dinheiro.format(Number(dashboard?.saldo_financeiro ?? 0))} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <Card>
            <CardHeader><CardTitle>Cadastro de Clientes</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={salvarCliente} className="grid gap-3">
                <Field label="Nome"><Input value={clienteForm.nome} onChange={(e) => setClienteForm({ ...clienteForm, nome: e.target.value })} required /></Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Telefone"><Input value={clienteForm.telefone} onChange={(e) => setClienteForm({ ...clienteForm, telefone: e.target.value })} /></Field>
                  <Field label="Email"><Input type="email" value={clienteForm.email} onChange={(e) => setClienteForm({ ...clienteForm, email: e.target.value })} /></Field>
                </div>
                <Field label="Observacoes"><Textarea value={clienteForm.observacoes} onChange={(e) => setClienteForm({ ...clienteForm, observacoes: e.target.value })} /></Field>
                <Button><Save size={16} />{clienteEditId ? "Salvar cliente" : "Criar cliente"}</Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Clientes</CardTitle></CardHeader>
            <CardContent>
              <SearchBar value={buscaCliente} onChange={setBuscaCliente} onSearch={carregarDados} placeholder="Buscar cliente" />
              <Table headers={["Nome", "Telefone", "Email", "Acoes"]}>
                {clientes.map((cliente) => (
                  <tr key={cliente.id}>
                    <td>{cliente.nome}</td><td>{cliente.telefone}</td><td>{cliente.email}</td>
                    <td className="flex gap-1">
                      <IconButton title="Editar" onClick={() => { setClienteEditId(cliente.id); setClienteForm({ nome: cliente.nome ?? '', telefone: cliente.telefone ?? '', email: cliente.email ?? '', observacoes: cliente.observacoes ?? '' }); }}><Edit size={16} /></IconButton>
                      <IconButton title="Excluir" onClick={async () => { await api.clientes.remove(cliente.id); await carregarDados(); }}><Trash2 size={16} /></IconButton>
                    </td>
                  </tr>
                ))}
              </Table>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <Card>
            <CardHeader><CardTitle>Estoque</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <form onSubmit={salvarProduto} className="grid gap-3">
                <Field label="ID"><Input value={produtoForm.id} disabled={Boolean(produtoEditId)} onChange={(e) => setProdutoForm({ ...produtoForm, id: e.target.value })} required /></Field>
                <Field label="Produto"><Input value={produtoForm.nome} onChange={(e) => setProdutoForm({ ...produtoForm, nome: e.target.value })} required /></Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Quantidade"><Input type="number" min={0} value={produtoForm.quantidade} onChange={(e) => setProdutoForm({ ...produtoForm, quantidade: Number(e.target.value) })} /></Field>
                  <Field label="Preco"><Input type="number" min={0} step="0.01" value={produtoForm.preco} onChange={(e) => setProdutoForm({ ...produtoForm, preco: Number(e.target.value) })} /></Field>
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
                {excelPreview && <p className="mt-2 text-sm text-muted-foreground">{excelPreview.validos} linhas validas de {excelPreview.total_linhas}</p>}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Produtos</CardTitle></CardHeader>
            <CardContent>
              <SearchBar value={buscaProduto} onChange={setBuscaProduto} onSearch={carregarDados} placeholder="Buscar produto" />
              <Table headers={["ID", "Produto", "Qtd", "Preco", "Acoes"]}>
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

        <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
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
                  <option value="pix">Pix</option><option value="dinheiro">Dinheiro</option><option value="credito">Credito</option><option value="debito">Debito</option>
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

        <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <Card>
            <CardHeader><CardTitle>Financeiro</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={salvarMovimento} className="grid gap-3">
                <Field label="Tipo">
                  <Select value={financeiroForm.tipo} onChange={(e) => setFinanceiroForm({ ...financeiroForm, tipo: e.target.value as "entrada" | "saida" })}>
                    <option value="saida">Saida</option><option value="entrada">Entrada</option>
                  </Select>
                </Field>
                <Field label="Descricao"><Input value={financeiroForm.descricao} onChange={(e) => setFinanceiroForm({ ...financeiroForm, descricao: e.target.value })} required /></Field>
                <Field label="Valor"><Input type="number" min={0.01} step="0.01" value={financeiroForm.valor} onChange={(e) => setFinanceiroForm({ ...financeiroForm, valor: Number(e.target.value) })} required /></Field>
                <Button><Save size={16} />Registrar movimento</Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Movimentacoes</CardTitle></CardHeader>
            <CardContent>
              <Table headers={["Data", "Tipo", "Descricao", "Valor"]}>
                {movimentos.map((movimento) => (
                  <tr key={movimento.id}>
                    <td>{new Date(movimento.created_at).toLocaleString("pt-BR")}</td><td>{movimento.tipo}</td><td>{movimento.descricao}</td><td>{dinheiro.format(Number(movimento.valor))}</td>
                  </tr>
                ))}
              </Table>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

function Metric({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-white p-4">
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
