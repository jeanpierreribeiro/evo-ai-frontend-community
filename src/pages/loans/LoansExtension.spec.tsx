// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
const api=vi.hoisted(()=>({get:vi.fn(),post:vi.fn()}));
vi.mock('@/services/loans/loansApi',()=>({default:api}));
import LoansExtension from './LoansExtension';
afterEach(()=>{cleanup();api.get.mockReset();api.post.mockReset();});
const suggestions={installmentId:'i1',contractVersion:3,ratePercent:'20',newDueDate:'2025-02-28',chargesComplete:false};
const preview={canExtend:true,requiredInterest:'0.00',principal:'700.00',newInterest:'140.00',newContractualTotal:'840.00',carriedPenalty:'20.00',carriedLateInterest:'0.00',carriedOtherFees:'0.00',totalWithCarriedFees:'860.00',newDueDate:'2025-02-28',chargesComplete:false};
async function prepare(){fireEvent.click(screen.getByRole('button',{name:'Consultar prorrogação'}));await screen.findByLabelText('Taxa da prorrogação (%)');fireEvent.click(screen.getByRole('button',{name:'Calcular prorrogação'}));await screen.findByText(/novo valor contratual: R\$ 840,00/);}
it('sugere taxa e vencimento, separa encargos e bloqueia juros antigos pendentes',async()=>{
  api.get.mockResolvedValue({data:{data:suggestions}});api.post.mockResolvedValue({data:{data:{...preview,canExtend:false,requiredInterest:'20.00'}}});
  render(<LoansExtension walletId="w1" contractId="c1" onExtended={vi.fn()}/>);await prepare();
  expect((screen.getByLabelText('Taxa da prorrogação (%)') as HTMLInputElement).value).toBe('20');
  expect((screen.getByLabelText('Novo vencimento') as HTMLInputElement).value).toBe('2025-02-28');
  expect(screen.getByText(/faltam R\$ 20,00/)).toBeTruthy();expect(screen.getByText(/Total com encargos transferidos: R\$ 860,00/)).toBeTruthy();
  fireEvent.click(screen.getByRole('checkbox',{name:'Confirmo a prorrogação apresentada'}));
  expect((screen.getByRole('button',{name:'Confirmar prorrogação'}) as HTMLButtonElement).disabled).toBe(true);
});
it('permite alterar taxa e repete a confirmação com a mesma chave',async()=>{
  api.get.mockResolvedValue({data:{data:suggestions}});api.post.mockResolvedValueOnce({data:{data:{...preview,chargesComplete:true}}}).mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce({data:{data:{id:'e1'}}});
  const extended=vi.fn();render(<LoansExtension walletId="w1" contractId="c1" onExtended={extended}/>);
  fireEvent.click(screen.getByRole('button',{name:'Consultar prorrogação'}));await screen.findByLabelText('Taxa da prorrogação (%)');
  fireEvent.change(screen.getByLabelText('Taxa da prorrogação (%)'),{target:{value:'21'}});fireEvent.click(screen.getByRole('button',{name:'Calcular prorrogação'}));
  await screen.findByText(/novo valor contratual/);fireEvent.click(screen.getByRole('checkbox',{name:'Confirmo a prorrogação apresentada'}));fireEvent.click(screen.getByRole('button',{name:'Confirmar prorrogação'}));
  await screen.findByText(/Repita sem alterar os dados/);fireEvent.click(screen.getByRole('button',{name:'Confirmar prorrogação'}));
  await waitFor(()=>expect(extended).toHaveBeenCalledTimes(1));
  expect(api.post.mock.calls[1][2].headers['Idempotency-Key']).toBe(api.post.mock.calls[2][2].headers['Idempotency-Key']);
  expect(api.post.mock.calls[1][1].ratePercent).toBe('21');
});
it('explica quando o vencimento informado não prorroga a parcela',async()=>{
  api.get.mockResolvedValue({data:{data:suggestions}});
  api.post.mockRejectedValue({isAxiosError:true,response:{status:422,data:{code:'EXTENSION_DATE_NOT_LATER'}}});
  render(<LoansExtension walletId="w1" contractId="c1" onExtended={vi.fn()}/>);
  fireEvent.click(screen.getByRole('button',{name:'Consultar prorrogação'}));
  await screen.findByLabelText('Novo vencimento');
  fireEvent.change(screen.getByLabelText('Novo vencimento'),{target:{value:'2025-01-31'}});
  fireEvent.click(screen.getByRole('button',{name:'Calcular prorrogação'}));
  expect(await screen.findByText('O novo vencimento deve ser posterior ao vencimento atual da parcela.')).toBeTruthy();
  expect(screen.queryByRole('button',{name:'Confirmar prorrogação'})).toBeNull();
});
