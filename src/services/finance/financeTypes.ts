export type ScheduleType = 'RECEIVABLE' | 'PAYABLE';
export type ScheduleStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
export type TransactionOperation = 'CREDIT' | 'DEBIT';
export type TransactionStatus = 'CONFIRMED' | 'REVERSED';
export type WithholdingTaxType =
  | 'IRRF'
  | 'PIS'
  | 'COFINS'
  | 'CSLL'
  | 'CRF_CONSOLIDADO'
  | 'ISS_RETIDO'
  | 'INSS_RETIDO';

export interface BankAccount {
  id: string;
  name: string;
  bankName: string;
  bankCode?: string;
  agency?: string;
  accountNumber?: string;
  accountType: string;
  currency: string;
  openingBalance: string;
  initialBalance?: string;
  currentBalance?: string;
  isActive: boolean;
}

export interface Person {
  id: string;
  name: string;
  tradeName?: string;
  document?: string;
  documentNumber?: string;
  personType: 'INDIVIDUAL' | 'LEGAL_ENTITY';
  email?: string;
  phone?: string;
  pixKey?: string;
  isActive: boolean;
}

export interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  type?: string;
  resultNature: 'INCREASE_RESULT' | 'DECREASE_RESULT' | 'NO_RESULT';
  dreGroup: 'REVENUE' | 'DEDUCTION' | 'COST' | 'EXPENSE' | 'FINANCIAL_INCOME' | 'FINANCIAL_EXPENSE' | 'TAX' | 'NOT_IN_DRE';
  isAnalytic: boolean;
  isActive: boolean;
}

export interface CostCenter {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface PaymentMethod {
  id: string;
  name: string;
  code: string;
  type?: string;
  isActive: boolean;
}

export interface Transaction {
  id: string;
  operation: TransactionOperation;
  grossAmount: string;
  feeAmount: string;
  netAmount: string;
  transactionDate: string;
  competenceDate: string;
  accountId: string;
  description: string;
  status: TransactionStatus;
  bankAccount?: { id: string; name: string };
  person?: { id: string; name: string };
  paymentMethod?: { id: string; name: string };
}

export interface Schedule {
  id: string;
  type: ScheduleType;
  status: ScheduleStatus;
  originalAmount: string;
  settledPrincipal: string;
  remainingAmount?: string;
  dueDate: string;
  competenceDate: string;
  notes?: string;
  documentNumber?: string;
  document?: string;
  person?: { id: string; name: string; document?: string };
  bankAccount?: { id: string; name: string };
  chartOfAccount: { id: string; code: string; name: string; dreGroup?: string };
}

export type TaxFactGenerator = 'PAYMENT_DATE' | 'FISCAL_NOTE_DATE';
export type TaxDueAdjust = 'ANTECIPATE' | 'POSTPONE' | 'EXACT';

export interface TaxRule {
  id: string;
  taxType: WithholdingTaxType;
  revenueCode: string;
  description: string;
  defaultRate: string;
  dueDay: number;
  dueAdjust: TaxDueAdjust;
  factGenerator: TaxFactGenerator;
  minWithholdingAmount: string;
  cumulativePeriod: string;
  authority: string;
  legislationRef?: string;
  notes?: string;
  isActive: boolean;
}

export interface Holiday {
  id: string;
  date: string;
  description: string;
  type: 'NATIONAL' | 'STATE' | 'MUNICIPAL';
  state?: string;
  city?: string;
  isActive: boolean;
}

export interface TaxRuleSuggestion {
  taxRuleId: string;
  taxType: WithholdingTaxType;
  revenueCode: string;
  ratePercent: string;
  baseAmount: string;
  suggestedAmount: string;
  dueDate: string;
  dueAdjustReason: string;
  authority: string;
  notes?: string;
}

export interface WithholdingInput {
  taxType: WithholdingTaxType;
  ratePercent: string;
  baseAmount: string;
  amount: string;
  notes?: string;
  suggestedAmount?: string;
  divergenceReason?: string;
  taxRuleId?: string;
}

export interface SettlementPreview {
  batchType: ScheduleType;
  paidAt: string;
  totalPrincipalSettled: string;
  totalWithholdings: string;
  grossAmount: string;
  feeAmount: string;
  netAmount: string;
  payments: any[];
  taxGuidesToGenerate: any[];
}

export interface DreReport {
  period: { startDate: string; endDate: string };
  mode: 'competence' | 'cash';
  summary: {
    grossRevenue: string;
    deductions: string;
    netRevenue: string;
    costs: string;
    grossProfit: string;
    operatingExpenses: string;
    operatingResult: string;
    financialIncome: string;
    financialExpense: string;
    netFinancial: string;
    taxes: string;
    netResult: string;
  };
  groups: Record<string, any>;
}

export interface AgingReport {
  referenceDate: string;
  type: ScheduleType;
  totalOpenAmount: string;
  totalOpenCount: number;
  buckets: Record<string, { label: string; count: number; total: string; items: any[] }>;
}

export interface CashProjectionReport {
  referenceDate: string;
  days: number;
  currentRealBalance: string;
  projectedEndingBalance: string;
  totalReceivablesProjected: string;
  totalPayablesProjected: string;
  dailyTimeline: any[];
}

export interface WithholdingsReport {
  period: { startDate: string; endDate: string };
  totals: {
    totalWithheld: string;
    byTaxType: Record<string, string>;
  };
  items: Array<{
    id: string;
    settlementDate: string;
    scheduleType: ScheduleType;
    documentNumber?: string;
    counterpartyName: string;
    taxType: WithholdingTaxType;
    ratePercent: string;
    baseAmount: string;
    amount: string;
    suggestedAmount?: string;
    divergenceReason?: string;
    taxGuide?: {
      id: string;
      taxGuideKey?: string;
      dueDate: string;
      status: ScheduleStatus;
      amount: string;
    };
  }>;
}

export interface TaxCreditsReport {
  period: { startDate: string; endDate: string };
  totals: {
    totalCredits: string;
    byTaxType: Record<string, string>;
  };
  items: Array<{
    id: string;
    settlementDate: string;
    customerName: string;
    documentNumber?: string;
    taxType: WithholdingTaxType;
    ratePercent: string;
    baseAmount: string;
    creditAmount: string;
    divergenceReason?: string;
  }>;
}
