import React, { useState } from 'react';
import { AccountWallet, ContainerSkin, SavingsGoal } from '../types';
import { SavingsOverview } from './SavingsOverview';
import { GoalDetailView } from './GoalDetailView';
import { CreateGoalModal } from '../components/CreateGoalModal';
import { GoalReachedModal } from '../components/GoalReachedModal';

interface SavingsViewProps {
  savingsGoals: SavingsGoal[];
  accounts: AccountWallet[];
  totalSavedCentavos: number;
  onAddDeposit: (
    goalId: string,
    amountCentavos: number,
    date?: string,
    fromAccount?: string,
    allowOverdraft?: boolean
  ) => Promise<{ goal: SavingsGoal; isNewlyCompleted: boolean }>;
  onCreateGoal: (data: {
    title: string;
    targetCentavos: number;
    deadline: string;
    backingAccount: string;
    containerSkin: ContainerSkin;
    note?: string;
    emoji?: string;
  }) => Promise<void>;
  onUpdateSkin: (goalId: string, skin: ContainerSkin) => Promise<void>;
  onUpdateGoal: (
    goalId: string,
    updates: Partial<{ title: string; targetCentavos: number; deadline: string }>
  ) => Promise<void>;
  onMarkGoalCompleted: (goalId: string) => Promise<void>;
  onUpdateBalance?: (accountId: string, newBalanceCentavos: number) => Promise<any>;
  onOpenWallet: () => void;
  onOpenQuickDeposit: (goalId: string) => void;
}

export const SavingsView: React.FC<SavingsViewProps> = ({
  savingsGoals,
  accounts,
  totalSavedCentavos,
  onAddDeposit,
  onCreateGoal,
  onUpdateSkin,
  onUpdateGoal,
  onMarkGoalCompleted,
  onUpdateBalance,
  onOpenWallet,
  onOpenQuickDeposit,
}) => {
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [completedGoalForCelebration, setCompletedGoalForCelebration] = useState<SavingsGoal | null>(null);

  const selectedGoal = savingsGoals.find((g) => g.id === selectedGoalId);

  const handleDeposit = async (
    goalId: string,
    amountCentavos: number,
    date?: string,
    fromAccount?: string,
    allowOverdraft?: boolean
  ): Promise<boolean> => {
    const res = await onAddDeposit(goalId, amountCentavos, date, fromAccount, allowOverdraft);
    if (res.isNewlyCompleted) {
      setCompletedGoalForCelebration(res.goal);
    }
    return res.isNewlyCompleted;
  };

  return (
    <>
      {selectedGoal ? (
        <GoalDetailView
          goal={selectedGoal}
          accounts={accounts}
          onBack={() => setSelectedGoalId(null)}
          onAddDeposit={handleDeposit}
          onUpdateSkin={onUpdateSkin}
          onUpdateGoal={onUpdateGoal}
          onUpdateBalance={onUpdateBalance}
        />
      ) : (
        <SavingsOverview
          goals={savingsGoals}
          accounts={accounts}
          totalSavedCentavos={totalSavedCentavos}
          onSelectGoal={(id) => setSelectedGoalId(id)}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onOpenDepositModal={(id) => onOpenQuickDeposit(id)}
          onOpenWallet={onOpenWallet}
        />
      )}

      {/* Create Goal Modal */}
      <CreateGoalModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        accounts={accounts}
        onCreateGoal={onCreateGoal}
      />

      {/* Goal Reached Celebration Modal */}
      <GoalReachedModal
        goal={completedGoalForCelebration}
        isOpen={!!completedGoalForCelebration}
        onClose={() => setCompletedGoalForCelebration(null)}
        onMarkDone={(id) => onMarkGoalCompleted(id)}
      />
    </>
  );
};
