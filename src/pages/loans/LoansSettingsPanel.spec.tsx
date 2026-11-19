// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

const api=vi.hoisted(() => ({get:vi.fn(),put:vi.fn()}));
vi.mock('@/services/loans/loansApi',() => ({default:api}));
import LoansSettingsPanel from './LoansSettingsPanel';

afterEach(cleanup);
it('permite configurar taxa sugerida sem criar taxas de multa e mora presumidas',async () => {
  const settings={walletId:'w1',version:0,defaultRate:null,defaultMethod:null,penaltyRate:null,lateRate:null,firstPenaltyDays:null,penaltyEveryDays:null,lateMethod:'proportional'};
  api.get.mockResolvedValue({data:{data:settings}});
  api.put.mockResolvedValue({data:{data:{...settings,version:1,defaultRate:'13.9'}}});
  render(<LoansSettingsPanel walletId="w1" />);
  const input=await screen.findByLabelText('Taxa padrão (%)');
  fireEvent.change(input,{target:{value:'13,9'}});
  fireEvent.click(screen.getByRole('button',{name:'Salvar parâmetros'}));
  await screen.findByText('Parâmetros salvos.');
  expect(api.put).toHaveBeenCalledWith('/wallets/w1/settings',{
    expectedVersion:0,settings:{defaultRate:'13.9',defaultMethod:null,penaltyRate:null,lateRate:null,firstPenaltyDays:null,penaltyEveryDays:null,lateMethod:'proportional'},
  },{headers:{'Idempotency-Key':expect.any(String)}});
});
