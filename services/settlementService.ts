import { PartyEvent, SettlementReport, BalanceResult, TransferAction, ExpenseCategory } from "../types";

export const calculateSettlement = (event: PartyEvent): SettlementReport => {
  const balances: Record<string, BalanceResult> = {};
  let totalEventExpense = 0;
  const categoryMap: Record<string, number> = {};

  // Initialize balances
  event.members.forEach(m => {
    balances[m.id] = {
      memberId: m.id,
      memberName: m.name,
      avatarUrl: m.avatarUrl,
      netBalance: 0,
      totalPaid: 0,
      totalFairShare: 0
    };
  });

  // 1. Calculate raw balances
  event.expenses.forEach(expense => {
    totalEventExpense += expense.amount;

    // Category stats
    const catName = expense.category;
    categoryMap[catName] = (categoryMap[catName] || 0) + expense.amount;

    // Payer gets credit (positive)
    if (balances[expense.payerId]) {
      balances[expense.payerId].totalPaid += expense.amount;
      balances[expense.payerId].netBalance += expense.amount;
    }

    // Splitters get debt (negative)
    const splitCount = expense.involvedMemberIds.length;
    if (splitCount > 0) {
      const share = expense.amount / splitCount;
      expense.involvedMemberIds.forEach(mid => {
        if (balances[mid]) {
          balances[mid].totalFairShare += share;
          balances[mid].netBalance -= share;
        }
      });
    }
  });

  // Convert to array
  const balanceList = Object.values(balances).map(b => ({
    ...b,
    netBalance: Math.round(b.netBalance * 100) / 100 // Fix floating point issues
  }));

  // 2. Calculate Minimal Transfers (Greedy Algorithm)
  const transfers: TransferAction[] = [];
  
  // Separate into debtors (owe money) and creditors (receive money)
  let debtors = balanceList.filter(b => b.netBalance < -0.01).sort((a, b) => a.netBalance - b.netBalance); // Ascending (most negative first)
  let creditors = balanceList.filter(b => b.netBalance > 0.01).sort((a, b) => b.netBalance - a.netBalance); // Descending (most positive first)

  // While both lists have entries
  let i = 0; // index for debtors
  let j = 0; // index for creditors

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const amountOwed = Math.abs(debtor.netBalance);
    const amountToReceive = creditor.netBalance;

    const settlementAmount = Math.min(amountOwed, amountToReceive);
    
    // Record transfer
    if (settlementAmount > 0) {
      transfers.push({
        fromMemberId: debtor.memberId,
        fromName: debtor.memberName,
        toMemberId: creditor.memberId,
        toName: creditor.memberName,
        amount: Number(settlementAmount.toFixed(2))
      });
    }

    // Update remaining balances
    debtor.netBalance += settlementAmount;
    creditor.netBalance -= settlementAmount;

    // Move indices if settled (allow small float margin)
    if (Math.abs(debtor.netBalance) < 0.01) i++;
    if (Math.abs(creditor.netBalance) < 0.01) j++;
  }

  // 3. Category Breakdown for Chart
  const categoryBreakdown = Object.entries(categoryMap).map(([name, value]) => ({
    name,
    value: Number(value.toFixed(2))
  }));

  return {
    balances: balanceList,
    transfers,
    totalExpense: totalEventExpense,
    categoryBreakdown
  };
};