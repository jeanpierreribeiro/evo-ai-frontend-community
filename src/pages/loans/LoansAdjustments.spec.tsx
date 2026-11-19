// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
const api=vi.hoisted(()=>({get:vi.fn(),post:vi.fn()}));
vi.mock('@/services/loans/loansApi',()=>({default:api}));
import LoansAdjustments from './LoansAdjustments';
afterEach(()=>{cleanup();api.get.mockReset();api.post.mockReset();});
const balance={contractVersion:3,frozen:false,suggestedInstallmentId:'i1',installments:[{id:'i1',number:1,dueDate:'2025-02-01',total:'25.00'}]};
async function prepare(){
  fireEvent.click(screen.getByRole('button',{name:'Consultar encargos e ajustes'}));
  await screen.findByLabelText('Operação');
  fireEvent.change(screen.getByLabelText('Operação'),{target:{value:'discount'}});
  fireEvent.change(screen.getByLabelText('Valor'),{target:{value:'25.00'}});
  fireEvent.change(screen.getByLabelText('Data efetiva'),{target:{value:'2025-02-01'}});
  fireEvent.change(screen.getByLabelText('Motivo'),{target:{value:'Dispensa sintética'}});
  fireEvent.click(screen.getByRole('button',{name:'Calcular efeito'}));
  await screen.findByText('Antes R$ 25,00 · alteração R$ -25,00 · depois R$ 0,00');
}
it('separa desconto de recebimento e não permite confirmação enquanto a apuração está incompleta',async()=>{
  api.get.mockResolvedValue({data:{data:balance}});api.post.mockResolvedValue({data:{data:{before:'25.00',change:'-25.00',after:'0.00',chargesComplete:false}}});
  render(<LoansAdjustments walletId="w1" contractId="c1" onChanged={vi.fn()}/>);await prepare();
  expect(screen.getByText('Desconto e ajuste da dívida não são dinheiro recebido.')).toBeTruthy();
  fireEvent.click(screen.getByRole('checkbox',{name:'Confirmo a operação informada'}));
  expect((screen.getByRole('button',{name:'Registrar operação'}) as HTMLButtonElement).disabled).toBe(true);
  expect(api.post).toHaveBeenCalledTimes(1);
});
it('mantém a mesma chave ao repetir confirmação após resposta incerta',async()=>{
  api.get.mockResolvedValue({data:{data:balance}});api.post.mockResolvedValueOnce({data:{data:{before:'25.00',change:'-25.00',after:'0.00',chargesComplete:true}}}).mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce({data:{data:{id:'d1'}}});
  const changed=vi.fn();render(<LoansAdjustments walletId="w1" contractId="c1" onChanged={changed}/>);await prepare();
  fireEvent.click(screen.getByRole('checkbox',{name:'Confirmo a operação informada'}));fireEvent.click(screen.getByRole('button',{name:'Registrar operação'}));
  await screen.findByText(/Repita sem alterar os dados/);fireEvent.click(screen.getByRole('button',{name:'Registrar operação'}));
  await waitFor(()=>expect(changed).toHaveBeenCalledTimes(1));
  expect(api.post.mock.calls[1][2].headers['Idempotency-Key']).toBe(api.post.mock.calls[2][2].headers['Idempotency-Key']);
  expect(api.post.mock.calls[1][1]).toEqual({installmentId:'i1',expectedVersion:3,amount:'25.00',component:'otherFees',reason:'Dispensa sintética',effectiveOn:'2025-02-01'});
});
