export enum ExpenseCategory {
  Food = '餐饮',
  Hotel = '住宿',
  Transport = '出行',
  Tour = '游览',
  Shopping = '购物',
  Entertainment = '娱乐',
  Other = '其他'
}

export enum PaymentMethod {
  WeChat = '微信',
  Alipay = '支付宝',
  BankCard = '银行卡',
  Cash = '现金',
  CreditCard = '信用卡',
  Other = '其他'
}

export interface Member {
  id: string;
  name: string;
  avatarUrl: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  payerId: string;
  involvedMemberIds: string[]; // Who splits this bill
  date: number; // timestamp
  paymentMethod: PaymentMethod;
}

export interface PartyEvent {
  id: string;
  name: string;
  startDate: number; // timestamp
  endDate: number; // timestamp
  createdAt: number; // For sorting
  members: Member[];
  expenses: Expense[];
  isSettled: boolean;
  lastUpdated?: number; // For synchronization
}

export interface BalanceResult {
  memberId: string;
  memberName: string;
  avatarUrl: string;
  netBalance: number; // Positive = receives money, Negative = owes money
  totalPaid: number;
  totalFairShare: number;
}

export interface TransferAction {
  fromMemberId: string;
  fromName: string;
  toMemberId: string;
  toName: string;
  amount: number;
}

export interface SettlementReport {
  balances: BalanceResult[];
  transfers: TransferAction[];
  totalExpense: number;
  categoryBreakdown: { name: string; value: number }[];
}