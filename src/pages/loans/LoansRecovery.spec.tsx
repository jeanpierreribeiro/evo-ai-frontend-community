// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
const api=vi.hoisted(()=>({get:vi.fn(),post:vi.fn()}));
vi.mock('@/services/loans/loansApi',()=>({default:api}));
import LoansRecovery from './LoansRecovery';
afterEach(()=>{cleanup();api.get.mockReset();api.post.mockReset();});
const balance={contractVersion:3,maximum:'860.00',frozen:true,suggestedInstallmentId:'i1',installments:[{id:'i1',number:1,dueDate:'2025-01-31',total:'860.00'}]};
const allocation={installmentId:'i1',penalty:'20.00',interest:'120.00',lateInterest:'0.00',otherFees:'0.00',principal:'0.00'};
async function prepare(){
  fireEvent.click(screen.getByRole('button',{name:'Consultar recuperação'}));
  await screen.findByText('Saldo registrado em perda: R$ 860,00');
  fireEvent.change(screen.getByLabelText('Valor recebido'),{target:{value:'140.00'}});
  fireEvent.change(screen.getByLabelText('Data do recebimento'),{target:{value:'2025-02-03'}});
  fireEvent.click(screen.getByRole('button',{name:'Calcular recuperação'}));
  await screen.findByText('Saldo após recuperação: R$ 720,00');
}
it('exibe a alocação e impede a confirmação enquanto os encargos não estão validados',async()=>{
  api.get.mockResolvedValue({data:{data:balance}});
  api.post.mockResolvedValue({data:{data:{chargesComplete:false,remaining:'720.00',allocations:[allocation]}}});
  render(<LoansRecovery walletId="w1" contractId="c1" onRecovered={vi.fn()}/>);await prepare();
  expect(screen.getByText(/Parcela 1: multa R\$ 20,00/)).toBeTruthy();
  fireEvent.click(screen.getByRole('checkbox',{name:'Confirmo o recebimento informado'}));
  expect((screen.getByRole('button',{name:'Registrar recuperação'}) as HTMLButtonElement).disabled).toBe(true);
  expect(api.post).toHaveBeenCalledTimes(1);
});
it('repete com a mesma chave após resposta incerta quando a prévia está completa',async()=>{
  api.get.mockResolvedValue({data:{data:balance}});
  api.post.mockResolvedValueOnce({data:{data:{chargesComplete:true,remaining:'720.00',allocations:[allocation]}}}).mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce({data:{data:{id:'p1'}}});
  const recovered=vi.fn();render(<LoansRecovery walletId="w1" contractId="c1" onRecovered={recovered}/>);await prepare();
  fireEvent.click(screen.getByRole('checkbox',{name:'Confirmo o recebimento informado'}));fireEvent.click(screen.getByRole('button',{name:'Registrar recuperação'}));
  await screen.findByText(/Repita sem alterar os dados/);fireEvent.click(screen.getByRole('button',{name:'Registrar recuperação'}));
  await waitFor(()=>expect(recovered).toHaveBeenCalledTimes(1));
  expect(api.post.mock.calls[1][2].headers['Idempotency-Key']).toEqual(api.post.mock.calls[2][2].headers['Idempotency-Key']);
});
it('permite selecionar outra parcela na prévia de recebimento comum e não aceita excedente',async()=>{
  api.get.mockResolvedValue({data:{data:{...balance,maximum:'1060.00',frozen:false,installments:[...balance.installments,{id:'i2',number:2,dueDate:'2025-02-28',total:'200.00'}]}}});
  api.post.mockRejectedValue(Object.assign(new Error('excess'),{isAxiosError:true,response:{status:422,data:{code:'PAYMENT_EXCEEDS_BALANCE',maximum:'1060.00'}}}));
  render(<LoansRecovery walletId="w1" contractId="c1" mode="normal" onRecovered={vi.fn()}/>);
  fireEvent.click(screen.getByRole('button',{name:'Consultar recebimento'}));
  await screen.findByText('Saldo registrado no contrato: R$ 1060,00');
  fireEvent.change(screen.getByLabelText('Parcela para recebimento'),{target:{value:'i2'}});
  fireEvent.change(screen.getByLabelText('Valor recebido'),{target:{value:'1100.00'}});
  fireEvent.change(screen.getByLabelText('Data do recebimento'),{target:{value:'2025-02-03'}});
  fireEvent.click(screen.getByRole('button',{name:'Calcular recebimento'}));
  await screen.findByText('O valor excede o saldo registrado.');
  expect(api.post).toHaveBeenCalledWith('/wallets/w1/contracts/c1/payments/preview',{selectedInstallmentId:'i2',amount:'1100.00',paidOn:'2025-02-03',expectedVersion:3});
});
