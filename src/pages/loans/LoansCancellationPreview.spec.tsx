// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
const api=vi.hoisted(()=>({get:vi.fn(),post:vi.fn()}));
vi.mock('@/services/loans/loansApi',()=>({default:api}));
import LoansCancellationPreview from './LoansCancellationPreview';
afterEach(()=>{cleanup();api.get.mockReset();api.post.mockReset();});

it('mostra principal compensado e restante sem simular cancelamento',async()=>{
  api.get.mockResolvedValue({data:{data:{principalDelivered:'1000.00',principalReceived:'200.00',principalToReturn:'800.00',receivedComponents:{interest:'30.00',penalty:'5.00',lateInterest:'2.00',otherFees:'1.00'},canConfirm:false}}});
  render(<LoansCancellationPreview walletId="w1" contractId="c1"/>);
  fireEvent.click(screen.getByRole('button',{name:'Consultar cancelamento'}));
  await screen.findByText('Principal restante a devolver: R$ 800,00');
  expect(screen.getByText('Principal já recebido: R$ 200,00')).toBeTruthy();
  expect(screen.getByText(/Esta consulta não registra devolução/)).toBeTruthy();
  expect(api.get).toHaveBeenCalledWith('/wallets/w1/contracts/c1/cancellation-preview');
});

it('solicita escolhas por componente e apresenta devolução parcial separada',async()=>{
  const base={contractVersion:3,principalDelivered:'1000.00',principalReceived:'10.00',principalToReturn:'990.00',receivedComponents:{interest:'100.00',penalty:'20.00',lateInterest:'10.00',otherFees:'7.00'},canConfirm:false};
  api.get.mockResolvedValue({data:{data:base}});
  api.post.mockResolvedValue({data:{data:{...base,refunds:{interest:{received:'100.00',refund:'40.00',retained:'60.00'},penalty:{received:'20.00',refund:'20.00',retained:'0.00'},lateInterest:{received:'10.00',refund:'0.00',retained:'10.00'},otherFees:{received:'7.00',refund:'2.00',retained:'5.00'}}}}});
  render(<LoansCancellationPreview walletId="w1" contractId="c1"/>);
  fireEvent.click(screen.getByRole('button',{name:'Consultar cancelamento'}));
  await screen.findByText('Principal restante a devolver: R$ 990,00');
  fireEvent.change(screen.getByLabelText('Juros:'),{target:{value:'partial'}});
  fireEvent.change(screen.getByLabelText('Valor de juros'),{target:{value:'40.00'}});
  fireEvent.change(screen.getByLabelText('Multa:'),{target:{value:'all'}});
  fireEvent.change(screen.getByLabelText('Mora:'),{target:{value:'keep'}});
  fireEvent.change(screen.getByLabelText('Outros encargos:'),{target:{value:'partial'}});
  fireEvent.change(screen.getByLabelText('Valor de outros encargos'),{target:{value:'2.00'}});
  fireEvent.click(screen.getByRole('button',{name:'Calcular escolhas'}));
  await screen.findByText('Manter R$ 60,00 · devolver R$ 40,00');
  expect(api.post).toHaveBeenCalledWith('/wallets/w1/contracts/c1/cancellation-preview',{expectedVersion:3,choices:{interest:{mode:'partial',amount:'40.00'},penalty:{mode:'all'},lateInterest:{mode:'keep'},otherFees:{mode:'partial',amount:'2.00'}}});
});

it('explica que dependências precisam de conferência',async()=>{
  api.get.mockRejectedValue(Object.assign(new Error('conflict'),{isAxiosError:true,response:{data:{code:'CANCELLATION_DEPENDENCIES_PENDING'}}}));
  render(<LoansCancellationPreview walletId="w1" contractId="c1"/>);
  fireEvent.click(screen.getByRole('button',{name:'Consultar cancelamento'}));
  await screen.findByText(/possui operações que precisam ser conferidas/);
});
