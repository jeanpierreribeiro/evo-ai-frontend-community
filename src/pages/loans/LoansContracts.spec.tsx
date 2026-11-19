// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
const api=vi.hoisted(()=>({get:vi.fn(),post:vi.fn()}));
vi.mock('@/services/loans/loansApi',()=>({default:api}));
import LoansContracts from './LoansContracts';
afterEach(cleanup);

it('mostra o cronograma persistido do contrato confirmado',async()=>{
  const client={name:'Cliente sintético',cpfPending:false};
  api.get.mockImplementation(async(url:string)=>url.endsWith('/c1')
    ? {data:{data:{id:'c1',client,principal:'700.00',ratePercent:'20',conditions:{penaltyRate:null,lateRate:null,firstPenaltyDays:null,penaltyEveryDays:null,lateMethod:'proportional'},installments:[{number:1,dueDate:'2025-01-31',principal:'700.00',interest:'140.00',total:'840.00'}]}}}
    : {data:{data:[{id:'c1',client,principal:'700.00',ratePercent:'20'}],page:1,hasMore:false}});
  render(<LoansContracts walletId="w1" revision={0} />);
  await screen.findByText('Cliente sintético — R$ 700,00 — 20%');
  fireEvent.click(screen.getByRole('button',{name:'Ver contrato'}));
  await screen.findByText('Parcela 1: 31/01/2025 — principal R$ 700,00, juros R$ 140,00, total original R$ 840,00');
  expect(api.get).toHaveBeenCalledWith('/wallets/w1/contracts/c1');
});

it('solicita correção auditada de data estimada e mantém a data original visível',async()=>{
  const client={name:'Cliente histórico',cpfPending:false};
  const base={id:'c1',client,principal:'500.00',ratePercent:'10',version:1,origin:'historical',conditions:{penaltyRate:null,lateRate:null,firstPenaltyDays:null,penaltyEveryDays:null,lateMethod:'proportional'},installments:[]};
  const payment={id:'p1',amount:'450.00',paidOn:'2024-01-30',historical:true,estimated:true,effectivePaidOn:'2024-01-30',effectiveEstimated:true,dateCorrections:[]};
  let corrected=false;
  api.get.mockImplementation(async(url:string)=>url.endsWith('/c1')
    ? {data:{data:{...base,version:corrected?2:1,payments:[corrected?{...payment,effectivePaidOn:'2024-02-02',effectiveEstimated:false,dateCorrections:[{previousPaidOn:'2024-01-30',correctedPaidOn:'2024-02-02',reason:'Comprovante'}]}:payment]}}}
    : {data:{data:[base],page:1,hasMore:false}});
  api.post.mockImplementation(async()=>{corrected=true;return {data:{data:{}}};});
  render(<LoansContracts walletId="w1" revision={0} />);
  await screen.findByRole('button',{name:'Ver contrato'});
  fireEvent.click(screen.getByRole('button',{name:'Ver contrato'}));
  await screen.findByText('R$ 450,00 em 30/01/2024 (data estimada) — histórico');
  fireEvent.click(screen.getByRole('button',{name:'Corrigir data estimada'}));
  fireEvent.change(screen.getByLabelText('Data exata'),{target:{value:'2024-02-02'}});
  fireEvent.change(screen.getByLabelText('Motivo da correção'),{target:{value:'Comprovante'}});
  fireEvent.click(screen.getByRole('button',{name:'Salvar data exata'}));
  await screen.findByText('Data histórica corrigida.');
  await screen.findByText('Data anterior: 30/01/2024 — motivo: Comprovante');
  expect(api.post).toHaveBeenCalledWith('/wallets/w1/contracts/c1/payments/p1/date-corrections',{correctedPaidOn:'2024-02-02',reason:'Comprovante',expectedVersion:1},{headers:{'Idempotency-Key':expect.any(String)}});
});
