// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const api=vi.hoisted(() => ({get:vi.fn(),post:vi.fn()}));
vi.mock('@/services/loans/loansApi',() => ({default:api}));
import LoansAttachments from './LoansAttachments';

beforeEach(() => {api.get.mockReset();api.post.mockReset();api.get.mockResolvedValue({data:{data:[],page:1,hasMore:false}});});
afterEach(cleanup);

it('envia um arquivo elegível com chave de operação e atualiza a lista',async () => {
  api.post.mockResolvedValue({data:{data:{id:'a1'}}});
  render(<LoansAttachments walletId="w1" clientId="c1" />);
  await screen.findByText('Nenhum anexo.');
  const file=new File(['synthetic'],'document.pdf',{type:'application/pdf'});
  fireEvent.change(screen.getByLabelText('Arquivo'),{target:{files:[file]}});
  fireEvent.click(screen.getByRole('button',{name:'Enviar anexo'}));
  await screen.findByText('Anexo enviado.');
  const [url,form,config]=api.post.mock.calls[0];
  expect(url).toBe('/wallets/w1/clients/c1/attachments');
  expect(form.get('file')).toBe(file);
  expect(config.headers['Idempotency-Key']).toEqual(expect.any(String));
});

it('impede o envio de arquivo com tipo não permitido',async () => {
  render(<LoansAttachments walletId="w1" clientId="c1" />);
  await screen.findByText('Nenhum anexo.');
  fireEvent.change(screen.getByLabelText('Arquivo'),{target:{files:[new File(['x'],'bad.html',{type:'text/html'})]}});
  fireEvent.click(screen.getByRole('button',{name:'Enviar anexo'}));
  await waitFor(() => expect(screen.getByText('Selecione um PDF, PNG ou JPG de até 5 MiB.')).toBeTruthy());
  expect(api.post).not.toHaveBeenCalled();
});
