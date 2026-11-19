// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
const api=vi.hoisted(()=>({get:vi.fn(),post:vi.fn()}));
vi.mock('@/services/loans/loansApi',()=>({default:api}));
import LoansNegotiation from './LoansNegotiation';
afterEach(()=>{cleanup();api.get.mockReset();api.post.mockReset();});
it('exige escolhas para encargos e apresenta componentes sem gerar caixa',async()=>{
  api.get.mockResolvedValue({data:{data:{contractVersion:2,frozen:false,installments:[{id:'i1',number:1,principal:'700.00',interest:'140.00',penalty:'20.00',lateInterest:'10.00',otherFees:'7.00'}]}}});
  const result={source:{principal:'700.00',interest:'140.00',penalty:'20.00',lateInterest:'10.00',otherFees:'7.00'},newInterest:'140.00',newContractualTotal:'840.00',carried:{interest:'140.00',penalty:'20.00',lateInterest:'0.00',otherFees:'5.00'},waived:{lateInterest:'10.00',otherFees:'2.00'},totalAfterAgreement:'1005.00',distributionComplete:false,canConfirm:false,chargesComplete:false,schedule:[{number:1,dueDate:'2025-02-28',total:'840.00'}]};
  api.post.mockResolvedValueOnce({data:{data:result}}).mockResolvedValueOnce({data:{data:{...result,distributionComplete:true,schedule:[{...result.schedule[0],totalWithCarried:'1005.00'}]}}});
  render(<LoansNegotiation walletId="w1" contractId="c1" previousRate="20" previousInterval="monthly"/>);
  fireEvent.click(screen.getByRole('button',{name:'Consultar renegociação'}));
  await screen.findByText(/Parcela 1: principal R\$ 700,00/);
  fireEvent.change(screen.getByLabelText('Primeiro vencimento do acordo'),{target:{value:'2025-02-28'}});
  expect((screen.getByRole('button',{name:'Calcular acordo'}) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(screen.getByLabelText('Mora'),{target:{value:'waive'}});
  fireEvent.change(screen.getByLabelText('Motivo para mora'),{target:{value:'Dispensa combinada'}});
  fireEvent.change(screen.getByLabelText('Encargos avulsos'),{target:{value:'partial_waive'}});
  fireEvent.change(screen.getByLabelText('Valor a dispensar de encargos avulsos'),{target:{value:'2.00'}});
  fireEvent.change(screen.getByLabelText('Motivo para encargos avulsos'),{target:{value:'Dispensa parcial'}});
  fireEvent.click(screen.getByRole('button',{name:'Calcular acordo'}));
  await screen.findByText('Total previsto: R$ 1005,00');
  expect(screen.getByText(/juros antigos R\$ 140,00 · multa R\$ 20,00/)).toBeTruthy();
  expect(screen.getByText(/prévia não registra recebimento nem entrega/)).toBeTruthy();
  expect(api.post).toHaveBeenCalledWith('/wallets/w1/contracts/c1/negotiations/preview',{ratePercent:'20',periods:1,interval:'monthly',firstDueDate:'2025-02-28',expectedVersion:2,lateInterest:{action:'waive',reason:'Dispensa combinada'},otherFees:{action:'partial_waive',amount:'2.00',reason:'Dispensa parcial'}});
  fireEvent.change(screen.getByLabelText('Juros antigos na parcela 1'),{target:{value:'140.00'}});
  fireEvent.change(screen.getByLabelText('Multa na parcela 1'),{target:{value:'20.00'}});
  fireEvent.change(screen.getByLabelText('Encargos avulsos na parcela 1'),{target:{value:'5.00'}});
  fireEvent.click(screen.getByRole('button',{name:'Conferir distribuição'}));
  await screen.findByText('Distribuição conferida com os valores transferidos.');
  expect(api.post.mock.calls[1][1].distribution).toEqual([{number:1,interest:'140.00',penalty:'20.00',lateInterest:'0.00',otherFees:'5.00'}]);
  expect(screen.getByText(/total com componentes anteriores R\$ 1005,00/)).toBeTruthy();
});

it('apresenta acordo sem principal e sem juros novos, com encargos separados',async()=>{
  api.get.mockResolvedValue({data:{data:{contractVersion:3,frozen:false,installments:[{id:'i1',number:1,principal:'0.00',interest:'15.00',penalty:'20.00',lateInterest:'10.00',otherFees:'7.00'}]}}});
  api.post.mockResolvedValue({data:{data:{source:{principal:'0.00',interest:'15.00',penalty:'20.00',lateInterest:'10.00',otherFees:'7.00'},newInterest:'0.00',newContractualTotal:'0.00',carried:{interest:'15.00',penalty:'20.00',lateInterest:'10.00',otherFees:'7.00'},waived:{lateInterest:'0.00',otherFees:'0.00'},totalAfterAgreement:'52.00',distributionComplete:false,canConfirm:false,chargesComplete:false,schedule:[{number:1,dueDate:'2025-03-01',total:'0.00'}]}}});
  render(<LoansNegotiation walletId="w1" contractId="c1" previousRate="20" previousInterval="monthly"/>);
  fireEvent.click(screen.getByRole('button',{name:'Consultar renegociação'}));await screen.findByText(/Parcela 1: principal R\$ 0,00/);
  fireEvent.change(screen.getByLabelText('Primeiro vencimento do acordo'),{target:{value:'2025-03-01'}});
  fireEvent.change(screen.getByLabelText('Mora'),{target:{value:'carry'}});fireEvent.change(screen.getByLabelText('Encargos avulsos'),{target:{value:'carry'}});
  fireEvent.click(screen.getByRole('button',{name:'Calcular acordo'}));
  await screen.findByText('Total previsto: R$ 52,00');expect(screen.getByText(/novos juros: R\$ 0,00/)).toBeTruthy();
  expect(screen.getByText(/confirmação do acordo ainda não está disponível/)).toBeTruthy();
});
