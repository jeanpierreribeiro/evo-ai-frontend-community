// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
const api=vi.hoisted(()=>({post:vi.fn()}));
vi.mock('@/services/loans/loansApi',()=>({default:api}));
import LoansLossCorrection from './LoansLossCorrection';
afterEach(()=>{cleanup();api.post.mockReset();});
function choose(mode:string) {
  fireEvent.click(screen.getByRole('button',{name:'Corrigir marcação de perda'}));
  fireEvent.change(screen.getByLabelText('Encargos do período'),{target:{value:mode}});
  fireEvent.change(screen.getByLabelText('Motivo da correção'),{target:{value:'Motivo sintético'}});
  fireEvent.click(screen.getByRole('checkbox',{name:'Confirmo o retorno do saldo à cobrança'}));
  fireEvent.click(screen.getByRole('button',{name:'Confirmar correção de perda'}));
}
it('registra escolha explícita de não calcular e preserva a chave após timeout',async()=>{
  api.post.mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce({data:{}});
  const corrected=vi.fn();render(<LoansLossCorrection walletId="w1" contractId="c1" lossId="l1" version={4} onCorrected={corrected}/>);
  choose('none');await screen.findByText(/Repita sem alterar os dados/);
  fireEvent.click(screen.getByRole('button',{name:'Confirmar correção de perda'}));
  await waitFor(()=>expect(corrected).toHaveBeenCalledTimes(1));
  expect(api.post.mock.calls[0][1]).toEqual({reason:'Motivo sintético',calculateFrozenCharges:false,expectedVersion:4});
  expect(api.post.mock.calls[0][2].headers['Idempotency-Key']).toEqual(api.post.mock.calls[1][2].headers['Idempotency-Key']);
});
it('explica que a escolha de calcular encargos está pendente',async()=>{
  api.post.mockRejectedValue(Object.assign(new Error('pending'),{isAxiosError:true,response:{status:409,data:{code:'CHARGE_RULE_PENDING'}}}));
  const corrected=vi.fn();render(<LoansLossCorrection walletId="w1" contractId="c1" lossId="l1" version={4} onCorrected={corrected}/>);
  choose('calculate');await screen.findByText('O cálculo de encargos do período de perda ainda não está disponível.');
  expect(corrected).not.toHaveBeenCalled();expect(api.post.mock.calls[0][1].calculateFrozenCharges).toBe(true);
});
