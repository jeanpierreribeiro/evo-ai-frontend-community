import { financeApi } from './financeApi';
import type {
  BankAccount,
  Person,
  ChartOfAccount,
  CostCenter,
  PaymentMethod,
  Transaction,
  Schedule,
  SettlementPreview,
  DreReport,
  AgingReport,
  CashProjectionReport,
  WithholdingInput,
  TaxRule,
  Holiday,
  TaxRuleSuggestion,
  WithholdingsReport,
  TaxCreditsReport,
} from './financeTypes';

export const financeService = {
  // --- Bank Accounts ---
  async listBankAccounts(): Promise<BankAccount[]> {
    const { data } = await financeApi.get('/bank-accounts');
    return data;
  },

  async getBankAccount(id: string): Promise<BankAccount> {
    const { data } = await financeApi.get(`/bank-accounts/${id}`);
    return data;
  },

  async createBankAccount(payload: Partial<BankAccount>): Promise<BankAccount> {
    const { data } = await financeApi.post('/bank-accounts', payload);
    return data;
  },

  // --- Transactions ---
  async listTransactions(params?: {
    accountId?: string;
    operation?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: Transaction[]; pagination: any }> {
    const { data } = await financeApi.get('/transactions', { params });
    return data;
  },

  async createTransaction(payload: any): Promise<Transaction> {
    const { data } = await financeApi.post('/transactions', payload);
    return data;
  },

  async reverseTransaction(id: string, reason: string): Promise<any> {
    const { data } = await financeApi.post(`/transactions/${id}/reverse`, { reason });
    return data;
  },

  // --- Schedules (Contas a Pagar / Receber) ---
  async listSchedules(params?: {
    type?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: Schedule[]; pagination: any }> {
    const { data } = await financeApi.get('/schedules', { params });
    return data;
  },

  async createSchedule(payload: any): Promise<Schedule> {
    const { data } = await financeApi.post('/schedules', payload);
    return data;
  },

  async cancelSchedule(id: string, reason: string): Promise<Schedule> {
    const { data } = await financeApi.post(`/schedules/${id}/cancel`, { reason });
    return data;
  },

  // --- Settlements (Baixas) ---
  async previewSettlement(payload: {
    accountId: string;
    paymentMethodId: string;
    paidAt: string;
    totalFeeAmount?: string;
    payments: Array<{
      scheduleId: string;
      principalSettled: string;
      discountAmount?: string;
      interestAmount?: string;
      fineAmount?: string;
      withholdings?: WithholdingInput[];
    }>;
  }): Promise<SettlementPreview> {
    const { data } = await financeApi.post('/settlements/preview', payload);
    return data;
  },

  async createSettlement(payload: any): Promise<any> {
    const { data } = await financeApi.post('/settlements', payload, {
      headers: {
        'Idempotency-Key': `settle-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      },
    });
    return data;
  },

  async reverseSettlement(id: string, reason: string): Promise<any> {
    const { data } = await financeApi.post(`/settlements/${id}/reverse`, { reason });
    return data;
  },

  // --- Transfers ---
  async createTransfer(payload: {
    sourceAccountId: string;
    destinationAccountId: string;
    amount: string;
    transferDate: string;
    description?: string;
  }): Promise<any> {
    const { data } = await financeApi.post('/transfers', payload);
    return data;
  },

  // --- OFX & Reconciliations ---
  async importOfx(payload: { bankAccountId: string; filename: string; contentText?: string; contentBase64?: string }): Promise<any> {
    const { data } = await financeApi.post('/ofx/import', payload);
    return data;
  },

  async listStatementEntries(params?: any): Promise<any> {
    const { data } = await financeApi.get('/ofx/entries', { params });
    return data;
  },

  async getReconciliationSuggestions(bankAccountId: string, toleranceDays = 3): Promise<any> {
    const { data } = await financeApi.get('/reconciliations/suggestions', {
      params: { bankAccountId, toleranceDays },
    });
    return data;
  },

  async matchReconciliation(payload: { matches: any[]; notes?: string }): Promise<any> {
    const { data } = await financeApi.post('/reconciliations/match', payload);
    return data;
  },

  async matchScheduleDirect(payload: { statementEntryId: string; scheduleId: string; paymentMethodId: string; notes?: string }): Promise<any> {
    const { data } = await financeApi.post('/reconciliations/match-schedule', payload);
    return data;
  },

  async unmatchReconciliation(id: string, reason: string): Promise<any> {
    const { data } = await financeApi.post(`/reconciliations/unmatch/${id}`, { reason });
    return data;
  },

  // --- Reports & DRE ---
  async getDre(startDate: string, endDate: string, mode: 'competence' | 'cash' = 'competence'): Promise<DreReport> {
    const { data } = await financeApi.get('/reports/dre', {
      params: { startDate, endDate, mode },
    });
    return data;
  },

  async getAging(type: 'RECEIVABLE' | 'PAYABLE' = 'RECEIVABLE', referenceDate?: string): Promise<AgingReport> {
    const { data } = await financeApi.get('/reports/aging', {
      params: { type, referenceDate },
    });
    return data;
  },

  async getCashProjection(daysAhead = 30, referenceDate?: string): Promise<CashProjectionReport> {
    const { data } = await financeApi.get('/reports/cash-flow-projection', {
      params: { daysAhead, referenceDate },
    });
    return data;
  },

  async getWithholdingsReport(params: {
    startDate: string;
    endDate: string;
    taxType?: string;
    status?: string;
  }): Promise<WithholdingsReport> {
    const { data } = await financeApi.get('/reports/withholdings', { params });
    return data;
  },

  async getTaxCreditsReport(params: {
    startDate: string;
    endDate: string;
    taxType?: string;
  }): Promise<TaxCreditsReport> {
    const { data } = await financeApi.get('/reports/tax-credits', { params });
    return data;
  },

  // --- Fiscal Rules & Holidays (FIN-W) ---
  async listTaxRules(params?: { taxType?: string; isActive?: boolean }): Promise<TaxRule[]> {
    const { data } = await financeApi.get('/tax-rules', { params });
    return data;
  },

  async createTaxRule(payload: Partial<TaxRule>): Promise<TaxRule> {
    const { data } = await financeApi.post('/tax-rules', payload);
    return data;
  },

  async updateTaxRule(id: string, payload: Partial<TaxRule>): Promise<TaxRule> {
    const { data } = await financeApi.put(`/tax-rules/${id}`, payload);
    return data;
  },

  async suggestTaxRules(payload: {
    baseAmount: number;
    operationType: 'PAYABLE' | 'RECEIVABLE';
    personId?: string;
    chartOfAccountId?: string;
  }): Promise<{ suggestions: TaxRuleSuggestion[]; rulesEvaluated: number }> {
    const { data } = await financeApi.post('/tax-rules/suggest', payload);
    return data;
  },

  async listHolidays(year?: number): Promise<Holiday[]> {
    const { data } = await financeApi.get('/tax-rules/holidays', { params: { year } });
    return data;
  },

  async createHoliday(payload: Partial<Holiday>): Promise<Holiday> {
    const { data } = await financeApi.post('/tax-rules/holidays', payload);
    return data;
  },

  async deleteHoliday(id: string): Promise<any> {
    const { data } = await financeApi.delete(`/tax-rules/holidays/${id}`);
    return data;
  },

  // --- Auxiliary Entities ---
  async listPersons(): Promise<Person[]> {
    const { data } = await financeApi.get('/persons');
    return data;
  },

  async listChartOfAccounts(): Promise<ChartOfAccount[]> {
    const { data } = await financeApi.get('/chart-of-accounts');
    return data;
  },

  async listCostCenters(): Promise<CostCenter[]> {
    const { data } = await financeApi.get('/cost-centers');
    return data;
  },

  async listPaymentMethods(): Promise<PaymentMethod[]> {
    const { data } = await financeApi.get('/payment-methods');
    return data;
  },

  async getCompanySettings(): Promise<any> {
    const { data } = await financeApi.get('/company-settings');
    return data;
  },

  async updateCompanySettings(payload: any): Promise<any> {
    const { data } = await financeApi.put('/company-settings', payload);
    return data;
  },
};
