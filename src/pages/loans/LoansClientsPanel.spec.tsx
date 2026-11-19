// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const api=vi.hoisted(() => ({get:vi.fn(),post:vi.fn(),put:vi.fn()}));
vi.mock('@/services/loans/loansApi',() => ({default:api}));
import LoansClientsPanel from './LoansClientsPanel';

beforeEach(() => {
  api.get.mockReset(); api.post.mockReset(); api.put.mockReset();
  api.get.mockImplementation(async (url:string) => url.endsWith('/identity')
    ? {data:{data:{cpf:'529.982.247-25',rg:'RG sintético'}}}
    : {data:{data:[{id:'c1',name:'Cliente',version:1,cpfPending:false,cpfMasked:'***.***.***-25'}],page:1,hasMore:false}});
});

it('edita os dados sem alterar RG se não for solicitado',async () => {
  api.put.mockResolvedValue({data:{data:{id:'c1',version:2,name:'Novo nome'}}});
  render(<LoansClientsPanel walletId="w1" />);
  await screen.findByText('Cliente — ***.***.***-25');
  fireEvent.click(screen.getByRole('button',{name:'Editar cadastro'}));
  fireEvent.change(screen.getByLabelText('Nome do cliente'),{target:{value:'Novo nome'}});
  fireEvent.click(screen.getByRole('button',{name:'Salvar cadastro'}));
  await screen.findByText('Cadastro atualizado.');
  expect(api.put).toHaveBeenCalledWith('/wallets/w1/clients/c1',expect.objectContaining({expectedVersion:1,profile:expect.objectContaining({name:'Novo nome'})}),
    {headers:{'Idempotency-Key':expect.any(String)}});
  expect(api.put.mock.calls[0][1].profile).not.toHaveProperty('rg');
});
afterEach(cleanup);

it('cadastra dados do cliente e permite CPF em branco',async () => {
  api.post.mockResolvedValue({data:{data:{id:'c2',cpfPending:true}}});
  render(<LoansClientsPanel walletId="w1" />);
  await screen.findByText('Cliente — ***.***.***-25');
  fireEvent.change(screen.getByLabelText('Nome'),{target:{value:'Novo cliente'}});
  fireEvent.change(screen.getByLabelText('Nascimento'),{target:{value:'2000-02-29'}});
  fireEvent.change(screen.getByLabelText('Telefone'),{target:{value:'555555555'}});
  fireEvent.click(screen.getByRole('button',{name:'Cadastrar cliente'}));
  await screen.findByText('Cliente cadastrado.');
  expect(api.post).toHaveBeenCalledWith('/wallets/w1/clients',expect.objectContaining({name:'Novo cliente',cpf:'',birthDate:'2000-02-29',phone:'555555555'}),
    {headers:{'Idempotency-Key':expect.any(String)}});
});

it('mostra CPF mascarado e só exibe documentos depois de solicitar a visualização auditada',async () => {
  render(<LoansClientsPanel walletId="w1" />);
  await screen.findByText('Cliente — ***.***.***-25');
  expect(screen.queryByText('CPF: 529.982.247-25')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Ver documentos'}));
  await screen.findByText('CPF: 529.982.247-25');
  expect(api.get).toHaveBeenCalledWith('/wallets/w1/clients/c1/identity');
  fireEvent.click(screen.getByRole('button',{name:'Ocultar documentos'}));
  expect(screen.queryByText('CPF: 529.982.247-25')).toBeNull();
});

it('corrige CPF com versão e chave de operação',async () => {
  api.post.mockResolvedValue({data:{data:{id:'c1',version:2,cpfPending:false}}});
  render(<LoansClientsPanel walletId="w1" />);
  await screen.findByText('Cliente — ***.***.***-25');
  fireEvent.click(screen.getByRole('button',{name:'Corrigir CPF'}));
  fireEvent.change(screen.getByLabelText('Novo CPF'),{target:{value:'111.444.777-35'}});
  fireEvent.click(screen.getByRole('button',{name:'Salvar CPF'}));
  await screen.findByText('CPF atualizado.');
  expect(api.post).toHaveBeenCalledWith('/wallets/w1/clients/c1/cpf',{expectedVersion:1,cpf:'111.444.777-35'},
    {headers:{'Idempotency-Key':expect.any(String)}});
});
