// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
const api=vi.hoisted(()=>({get:vi.fn()}));
vi.mock('@/services/loans/loansApi',()=>({default:api}));
import LoansInterestAttribution from './LoansInterestAttribution';
afterEach(()=>{cleanup();api.get.mockReset();});
it('apresenta limites sem presumir a divisão dos juros recebidos',async()=>{
  api.get.mockResolvedValue({data:{data:{precise:false,installments:[{number:1,interestPaid:'50.00',oldInterest:'46.66',newInterest:'140.00',oldPaidMin:'0.00',oldPaidMax:'46.66',newPaidMin:'3.34',newPaidMax:'50.00',precise:false}]}}});
  render(<LoansInterestAttribution walletId="w1" contractId="c1"/>);
  fireEvent.click(screen.getByRole('button',{name:'Consultar juros do acordo'}));
  await screen.findByText(/registros não definem quanto/);
  expect(screen.getByText(/juros antigos, entre R\$ 0,00 e R\$ 46,66/)).toBeTruthy();
  expect(api.get).toHaveBeenCalledWith('/wallets/w1/contracts/c1/interest-attribution');
});
it('informa que ajustes posteriores impedem a separação segura',async()=>{
  api.get.mockRejectedValue(Object.assign(new Error('pending'),{isAxiosError:true,response:{data:{code:'INTEREST_ATTRIBUTION_PENDING'}}}));
  render(<LoansInterestAttribution walletId="w1" contractId="c1"/>);
  fireEvent.click(screen.getByRole('button',{name:'Consultar juros do acordo'}));
  await screen.findByText('Não é possível separar esses juros com segurança neste histórico.');
});
