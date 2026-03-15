import { PartyEvent, Member, Expense } from '../types';

export const mergeEvents = (local: PartyEvent, remote: PartyEvent): PartyEvent => {
  // 1. Members Union (By ID)
  // If ID conflicts, prefer remote name if it's longer/different (simple heuristic), or just keep local
  const mergedMembers: Member[] = [...local.members];
  
  remote.members.forEach(rMember => {
    const existingIndex = mergedMembers.findIndex(m => m.id === rMember.id);
    if (existingIndex === -1) {
      mergedMembers.push(rMember);
    } else {
      // If remote has a name and local doesn't (or placeholder), update it
      if (rMember.name && !mergedMembers[existingIndex].name) {
        mergedMembers[existingIndex] = rMember;
      }
    }
  });

  // 2. Expenses Union (By ID)
  // This ensures that if User A adds Expense 1 and User B adds Expense 2,
  // merging them results in [1, 2].
  const mergedExpenses: Expense[] = [...local.expenses];
  
  remote.expenses.forEach(rExpense => {
    const existingIndex = mergedExpenses.findIndex(e => e.id === rExpense.id);
    if (existingIndex === -1) {
      // New expense from remote
      mergedExpenses.push(rExpense);
    } else {
      // Conflict: Use the one with the later date/modification?
      // Since we don't have per-expense modification timestamps, we assume remote is "syncing" to us.
      // However, usually we trust the "Import" as the source of truth for conflict.
      mergedExpenses[existingIndex] = rExpense;
    }
  });

  // 3. Determine latest update time
  const newLastUpdated = Math.max(local.lastUpdated || 0, remote.lastUpdated || 0, Date.now());

  return {
    ...local, // Keep local ID base
    name: remote.lastUpdated && (!local.lastUpdated || remote.lastUpdated > local.lastUpdated) ? remote.name : local.name,
    startDate: remote.startDate,
    endDate: remote.endDate,
    members: mergedMembers,
    expenses: mergedExpenses,
    isSettled: remote.isSettled,
    lastUpdated: newLastUpdated
  };
};