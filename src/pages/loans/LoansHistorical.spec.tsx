// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const api=vi.hoisted(()=>({get:vi.fn(),post:vi.fn(),put:vi.fn()}));
vi.mock('@/services/loans/loansApi',()=>({default:api}));
import LoansHistorical from './LoansHistorical';
afterEach(cleanup);
beforeEach(()=>{api.get.mockReset();api.post.mockReset();api.put.mockReset();});

it('mantém rascunho quando falta a composição e separa desconto de recebimento',async()=>{
  const settings={version:0,defaultRate:'0',defaultMethod:'single',penaltyRate:null,lateRate:null,firstPenaltyDays:null,penaltyEveryDays:null,lateMethod:'proportional'};
  api.get.mockImplementation(async(url:string)=>url.endsWith('/settings') ? {data:{data:settings}}
    : url.endsWith('/clients') ? {data:{data:[{id:'c1',name:'Cliente sintético',cpfPending:true}],hasMore:false}}
    : {data:{data:[],hasMore:false}});
  api.post.mockResolvedValue({data:{data:{id:'h1',version:1,possibleDuplicates:0,review:{canConfirm:false,incompletePayments:1,installments:[{number:1,originalTotal:'500.00',discountTotal:'50.00',received:'450.00',remaining:null}]}}}});
  render(<LoansHistorical walletId="w1" />);
  await screen.findByRole('option',{name:'Cliente sintético — CPF pendente'});
  fireEvent.change(screen.getByLabelText('Cliente do histórico'),{target:{value:'c1'}});
  fireEvent.change(screen.getByLabelText('Principal histórico'),{target:{value:'500'}});
  fireEvent.change(screen.getByLabelText('Vencimento da parcela 1'),{target:{value:'2024-01-31'}});
  fireEvent.change(screen.getByLabelText('Original Principal'),{target:{value:'500'}});
  fireEvent.change(screen.getByLabelText('Desconto Principal'),{target:{value:'50'}});
  fireEvent.click(screen.getByRole('button',{name:'Adicionar pagamento'}));
  fireEvent.change(screen.getByLabelText('Valor recebido'),{target:{value:'450'}});
  fireEvent.change(screen.getByLabelText('Data do pagamento'),{target:{value:'2024-01-30'}});
  fireEvent.click(screen.getByRole('button',{name:'Salvar histórico em rascunho'}));
  await screen.findByText('Rascunho histórico salvo.');
  await screen.findByText('1 pagamento(s) sem composição: mantenha em rascunho.');
  expect((screen.getByRole('button',{name:'Confirmar histórico'}) as HTMLButtonElement).disabled).toBe(true);
  const payload=api.post.mock.calls[0][1];
  expect(payload.installments[0].discount.principal).toBe('50');
  expect(payload.installments[0].payments[0]).toMatchObject({amount:'450',paidOn:'2024-01-30',allocation:null});
});

it('permite três parcelas e exige conferência antes de registrar possível duplicidade',async()=>{
  const settings={version:0,defaultRate:'0',defaultMethod:'single',penaltyRate:null,lateRate:null,firstPenaltyDays:null,penaltyEveryDays:null,lateMethod:'proportional'};
  api.get.mockImplementation(async(url:string)=>url.endsWith('/settings') ? {data:{data:settings}}
    : url.endsWith('/clients') ? {data:{data:[{id:'c1',name:'Cliente sintético',cpfPending:false}],hasMore:false}}
    : {data:{data:[],hasMore:false}});
  api.post.mockImplementation(async(url:string)=>url.endsWith('/confirm') ? {data:{data:{id:'h1',contractId:'c1'}}}
    : {data:{data:{id:'h1',version:1,possibleDuplicates:1,review:{canConfirm:true,incompletePayments:0,installments:[
      {number:1,originalTotal:'100.00',discountTotal:'0.00',received:'100.00',remaining:'0.00'},
      {number:2,originalTotal:'100.00',discountTotal:'0.00',received:'0.00',remaining:'100.00'},
      {number:3,originalTotal:'100.00',discountTotal:'0.00',received:'0.00',remaining:'100.00'},
    ]}}}});
  render(<LoansHistorical walletId="w1" />);
  await screen.findByRole('option',{name:'Cliente sintético'});
  fireEvent.change(screen.getByLabelText('Cliente do histórico'),{target:{value:'c1'}});
  fireEvent.change(screen.getByLabelText('Principal histórico'),{target:{value:'300'}});
  fireEvent.click(screen.getByRole('button',{name:'Adicionar parcela histórica'}));
  fireEvent.click(screen.getByRole('button',{name:'Adicionar parcela histórica'}));
  const dueDates=['2024-01-31','2024-02-29','2024-03-31'];
  for(let number=1;number<=3;number++){
    const group=within(screen.getByRole('group',{name:`Parcela ${number}`}));
    fireEvent.change(group.getByLabelText(`Vencimento da parcela ${number}`),{target:{value:dueDates[number-1]}});
    fireEvent.change(group.getByLabelText('Original Principal'),{target:{value:'100'}});
  }
  const first=within(screen.getByRole('group',{name:'Parcela 1'}));
  fireEvent.click(first.getByRole('button',{name:'Adicionar pagamento'}));
  fireEvent.change(first.getByLabelText('Valor recebido'),{target:{value:'100'}});
  fireEvent.change(first.getByLabelText('Data do pagamento'),{target:{value:'2024-01-30'}});
  fireEvent.click(first.getByLabelText('Data estimada'));
  fireEvent.click(first.getByLabelText('Composição conhecida'));
  fireEvent.change(first.getByLabelText('Recebido Principal'),{target:{value:'100'}});
  fireEvent.click(screen.getByRole('button',{name:'Salvar histórico em rascunho'}));
  await screen.findByText('Rascunho histórico salvo.');
  const confirm=screen.getByRole('button',{name:'Confirmar histórico'}) as HTMLButtonElement;
  expect(confirm.disabled).toBe(true);
  fireEvent.click(screen.getByLabelText('Há possível duplicidade. Conferi e desejo prosseguir.'));
  expect(confirm.disabled).toBe(false);
  fireEvent.click(confirm);
  await screen.findByText('Contrato histórico registrado.');
  const creation=api.post.mock.calls.find(call=>call[0]==='/wallets/w1/historical-drafts');
  expect(creation?.[1].installments).toHaveLength(3);
  expect(creation?.[1].installments[0].payments[0]).toMatchObject({amount:'100',paidOn:'2024-01-30',estimated:true});
  expect(api.post).toHaveBeenCalledWith('/wallets/w1/historical-drafts/h1/confirm',{expectedVersion:1,acknowledgeDuplicate:true},{headers:{'Idempotency-Key':expect.any(String)}});
});
