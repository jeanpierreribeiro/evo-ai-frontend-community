// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
const api=vi.hoisted(()=>({get:vi.fn()}));
vi.mock('@/services/loans/loansApi',()=>({default:api}));
vi.mock('./LoansAttachments',()=>({default:()=> <div>Documentos do cliente</div>}));
import LoansClientFile from './LoansClientFile';
afterEach(()=>{cleanup();api.get.mockReset();});

it('apresenta dívida em perda, saldo, recuperação e histórico de correção',async()=>{
  api.get.mockImplementation(async(url:string)=>url.endsWith('/c1')?{data:{data:{state:'loss',version:4,currentBalance:'720.00',installments:[{number:1,dueDate:'2025-01-31',total:'840.00',active:true,charges:[],discounts:[],adjustments:[]}],payments:[{id:'p1',amount:'140.00',paidOn:'2025-02-03',effectivePaidOn:'2025-02-04',effectiveEstimated:false,recovery:true,dateCorrections:[{revision:1,previousPaidOn:'2025-02-03',correctedPaidOn:'2025-02-04',reason:'Comprovante'}]}],losses:[{id:'l1',amount:'860.00',lostOn:'2025-02-02',reason:'Motivo',corrections:[]}]}}}:{data:{data:[{id:'c1',state:'loss',origin:'historical',principal:'700.00',firstDueDate:'2025-01-31'}],page:1,hasMore:false}});
  render(<LoansClientFile walletId="w1" clientId="p1" notes="Observação sintética"/>);
  await screen.findByText(/Em perda/);
  fireEvent.click(screen.getByRole('button',{name:'Ver histórico'}));
  await screen.findByText(/Saldo registrado: R\$ 720.00/);
  expect(screen.getByText(/recuperação de perda/)).toBeTruthy();
  expect(screen.getByText(/Data anterior: 2025-02-03/)).toBeTruthy();
  expect(screen.getByText('Documentos do cliente')).toBeTruthy();
  expect(screen.getByRole('button',{name:'Corrigir marcação de perda'})).toBeTruthy();
  expect(api.get).toHaveBeenCalledWith('/wallets/w1/clients/p1/contracts/c1');
});

it('identifica contrato renegociado e vínculo para o acordo',async()=>{
  api.get.mockImplementation(async(url:string)=>url.endsWith('/c1')?{data:{data:{state:'renegotiated',version:3,currentBalance:'0.00',negotiationsFrom:[{targetContractId:'abcdefgh-0000',agreedOn:'2025-02-01',reason:'Acordo'}],negotiationTo:null,installments:[],payments:[],losses:[]}}}:{data:{data:[{id:'c1',state:'renegotiated',origin:'new',principal:'700.00',firstDueDate:'2025-01-31'}],page:1,hasMore:false}});
  render(<LoansClientFile walletId="w1" clientId="p1" notes=""/>);
  await screen.findByText(/Renegociado/);fireEvent.click(screen.getByRole('button',{name:'Ver histórico'}));
  await screen.findByText(/contrato de destino abcdefgh/);
  expect(screen.queryByText(/Em cobrança/)).toBeNull();
});

it('oferece consulta cautelosa de juros no contrato de acordo',async()=>{
  api.get.mockImplementation(async(url:string)=>url.endsWith('/c1')?{data:{data:{state:'confirmed',origin:'agreement',version:3,currentBalance:'100.00',negotiationsFrom:[],negotiationTo:{sourceContractId:'12345678-0000',agreedOn:'2025-02-01',reason:'Acordo'},installments:[],payments:[],losses:[]}}}:{data:{data:[{id:'c1',state:'confirmed',origin:'agreement',principal:'700.00',firstDueDate:'2025-01-31'}],page:1,hasMore:false}});
  render(<LoansClientFile walletId="w1" clientId="p1" notes=""/>);
  await screen.findByText(/Em cobrança/);fireEvent.click(screen.getByRole('button',{name:'Ver histórico'}));
  await screen.findByText(/Acordo de 2025-02-01 vinculado/);
  expect(screen.getByRole('button',{name:'Consultar juros do acordo'})).toBeTruthy();
});

it('mostra os componentes recebidos por parcela e navega entre origem e acordo',async()=>{
  const installment={id:'i1',number:1,dueDate:'2025-01-31',total:'840.00',active:true,charges:[],discounts:[],adjustments:[]};
  const payment={id:'p1',amount:'140.00',effectivePaidOn:'2025-01-30',effectiveEstimated:false,dateCorrections:[],allocations:[{installmentId:'i1',principal:'0.00',interest:'120.00',penalty:'20.00',lateInterest:'0.00',otherFees:'0.00'}]};
  api.get.mockImplementation(async(url:string)=>{
    if(url.endsWith('/source')) return {data:{data:{state:'renegotiated',origin:'new',version:3,currentBalance:'0.00',negotiationsFrom:[{targetContractId:'target',agreedOn:'2025-02-01',reason:'Acordo'}],installments:[installment],payments:[payment],losses:[]}}};
    if(url.endsWith('/target')) return {data:{data:{state:'confirmed',origin:'agreement',version:1,currentBalance:'700.00',negotiationTo:{sourceContractId:'source',agreedOn:'2025-02-01',reason:'Acordo'},installments:[],payments:[],losses:[]}}};
    return {data:{data:[{id:'source',state:'renegotiated',origin:'new',principal:'700.00',firstDueDate:'2025-01-31'}],page:1,hasMore:false}};
  });
  render(<LoansClientFile walletId="w1" clientId="p1" notes=""/>);
  await screen.findByText(/Renegociado/);fireEvent.click(screen.getByRole('button',{name:'Ver histórico'}));
  expect(await screen.findByText(/Parcela 1 · principal R\$ 0.00 · juros R\$ 120.00 · multa R\$ 20.00/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Ver contrato do acordo'}));
  expect(await screen.findByText(/Saldo registrado: R\$ 700.00/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Ver contrato de origem'}));
  expect(await screen.findByText(/Parcela 1 · principal R\$ 0.00/)).toBeTruthy();
  expect(api.get).toHaveBeenCalledWith('/wallets/w1/clients/p1/contracts/target');
});

it('consulta os registros relacionados ao recebimento da ficha selecionada',async()=>{
  api.get.mockImplementation(async(url:string)=>{
    if(url.endsWith('/dependencies')) return {data:{data:{relatedEvents:{otherPayments:1,extensions:0,charges:0,discounts:0,adjustments:0,losses:0,agreements:[]},payment:{dateCorrections:[]},canConfirm:false,dependenciesComplete:false}}};
    if(url.endsWith('/c1')) return {data:{data:{state:'confirmed',origin:'new',version:2,currentBalance:'20.00',installments:[],payments:[{id:'pay1',amount:'100.00',effectivePaidOn:'2025-01-01',effectiveEstimated:false,dateCorrections:[],allocations:[]}],losses:[]}}};
    return {data:{data:[{id:'c1',state:'confirmed',origin:'new',principal:'120.00',firstDueDate:'2025-01-31'}],page:1,hasMore:false}};
  });
  render(<LoansClientFile walletId="w1" clientId="client1" notes=""/>);
  await screen.findByText(/Em cobrança/);fireEvent.click(screen.getByRole('button',{name:'Ver histórico'}));
  fireEvent.click(await screen.findByRole('button',{name:'Consultar registros relacionados'}));
  expect(await screen.findByText(/Outros pagamentos: 1/)).toBeTruthy();
  expect(api.get).toHaveBeenCalledWith('/wallets/w1/contracts/c1/payments/pay1/dependencies');
});

it('reinicia a paginação ao trocar de cliente ou carteira',async()=>{
  api.get.mockImplementation(async(_url:string,options?:{params:{page:number}})=>({data:{data:[],page:options?.params.page ?? 1,hasMore:options?.params.page===1}}));
  const view=render(<LoansClientFile walletId="w1" clientId="p1" notes=""/>);
  await screen.findByText('Página 1');
  fireEvent.click(screen.getByRole('button',{name:'Próxima'}));
  await screen.findByText('Página 2');
  view.rerender(<LoansClientFile walletId="w2" clientId="p2" notes=""/>);
  await screen.findByText('Página 1');
  expect(api.get).toHaveBeenCalledWith('/wallets/w2/clients/p2/contracts',{params:{page:1}});
});
