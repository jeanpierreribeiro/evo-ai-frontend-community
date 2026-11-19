// A visibilidade da interface não substitui a autorização do serviço.
export const loansUiEnabled = String(import.meta.env.VITE_LOANS_UI_ENABLED).toLowerCase() === 'true';
