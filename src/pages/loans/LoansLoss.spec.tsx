// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
const api=vi.hoisted(()=>({get:vi.fn(),post:vi.fn()}));
vi.mock('@/services/loans/loansApi',()=>({default:api}));
import LoansLoss from './LoansLoss';
afterEach(()=>{cleanup();api.get.mockReset();api.post.mockReset();});
const balance={contractVersion:2,maximum:'860.00',frozen:false,installments:[{id:'i1',number:1,principal:'700.00',interest:'140.00',penalty:'20.00',lateInterest:'0.00',otherFees:'0.00'}]};

it('impede marcação enquanto encargos ainda não foram validados',async()=>{
  api.get.mockResolvedValue({data:{data:{...balance,chargesComplete:false}}});
  render(<LoansLoss walletId="w1" contractId="c1" onMarked={vi.fn()}/>);
  fireEvent.click(screen.getByRole('button',{name:'Consultar perda'}));
  await screen.findByText(/marcação de perda ficará disponível/);
  expect((screen.getByRole('button',{name:'Marcar perda integral'}) as HTMLButtonElement).disabled).toBe(true);
  expect(api.post).not.toHaveBeenCalled();
});

it('exige confirmação e repete com a mesma chave após resultado incerto',async()=>{
  api.get.mockResolvedValue({data:{data:{...balance,chargesComplete:true}}});
  api.post.mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce({data:{data:{id:'loss1'}}});
  const marked=vi.fn();render(<LoansLoss walletId="w1" contractId="c1" onMarked={marked}/>);
  fireEvent.click(screen.getByRole('button',{name:'Consultar perda'}));
  await screen.findByText(/Saldo integral registrado/);
  fireEvent.change(screen.getByLabelText('Data da perda'),{target:{value:'2025-02-02'}});
  fireEvent.change(screen.getByLabelText('Motivo da perda'),{target:{value:'Motivo sintético'}});
  expect((screen.getByRole('button',{name:'Marcar perda integral'}) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('checkbox',{name:'Confirmo a marcação do saldo integral como perda'}));
  fireEvent.click(screen.getByRole('button',{name:'Marcar perda integral'}));
  await screen.findByText(/Repita sem alterar os dados/);
  fireEvent.click(screen.getByRole('button',{name:'Marcar perda integral'}));
  await waitFor(()=>expect(marked).toHaveBeenCalledTimes(1));
  expect(api.post.mock.calls[0][2].headers['Idempotency-Key']).toEqual(api.post.mock.calls[1][2].headers['Idempotency-Key']);
  expect(api.post.mock.calls[0][1]).toEqual({lostOn:'2025-02-02',reason:'Motivo sintético',expectedVersion:2});
});
