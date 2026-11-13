import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CATEGORY_PRIVACY_TEXT,
  DEFAULT_CATEGORIES,
  InsufficientFundsError,
  categorizeExpense,
  createSubcategory,
  formatPHP,
  fromDbAccountType,
  getCategoryExpenseCount,
  getLearnedRules,
  getManilaDateString,
  getSubcategoryExpenseCount,
  getUserSafeErrorMessage,
  normalizeCategorizationText,
  pesosToCentavos,
  removeOrHideCategory,
  removeSubcategory,
  saveLearnedRule,
  updateAccountBalance as apiUpdateAccountBalance,
} from '../api';
import {
  AccountWallet,
  CategoryName,
  ExpenseCategory,
  ExpenseSubcategory,
} from '../types';
import {
  CategoryDeleteConfirmPayload,
  CategoryDeleteModal,
  PendingCategoryRemoval,
} from './CategoryDeleteModal';
import { InsufficientBalanceModal } from './InsufficientBalanceModal';
import { UpdateBalanceModal } from './UpdateBalanceModal';
import {
  Plus,
  Check,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  SlidersHorizontal,
  X,
  Pencil,
  Trash2,
  EyeOff,
} from 'lucide-react';

interface AddExpenseFormProps {
  categories?: ExpenseCategory[];
  useSubcategories?: boolean;
  accounts?: AccountWallet[];
  onExpenseAdded: (expense: {
    title: string;
    amountCentavos: number;
    category: CategoryName;
    categoryId?: string;
    subcategoryId?: string | null;
    subcategoryLabel?: string | null;
    categoryConfidence?: number | null;
    subcategoryConfidence?: number | null;
    categoryUserConfirmed?: boolean;
    date: string;
    account?: string;
    allowOverdraft?: boolean;
  }) => Promise<void>;
  defaultAccount?: string;
  onUpdateBalance?: (accountId: string, newBalanceCentavos: number) => Promise<any>;
  onSubcategoryCreated?: () => Promise<void>;
  onCategoriesChanged?: () => Promise<void>;
  onOpenManageCategories?: () => void;
  showToast?: (message: string) => void;
}

export const AddExpenseForm: React.FC<AddExpenseFormProps> = ({
  categories = DEFAULT_CATEGORIES,
  useSubcategories = true,
  accounts = [],
  onExpenseAdded,
  defaultAccount = 'GCash',
  onUpdateBalance,
  onSubcategoryCreated,
  onCategoriesChanged,
  onOpenManageCategories,
  showToast,
}) => {
  const activeAccounts = accounts.filter((a) => !a.isArchived);
  const activeCategories = categories.filter((c) => !c.isArchived);

  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);
  const [categoryConfidence, setCategoryConfidence] = useState<number | null>(null);
  const [subcategoryConfidence, setSubcategoryConfidence] = useState<number | null>(null);
  const [isCategoryOverridden, setIsCategoryOverridden] = useState(false);
  const [clearedForText, setClearedForText] = useState<string | null>(null);
  const [suggestedNewSubcategory, setSuggestedNewSubcategory] = useState<string | null>(null);
  const [categorizeStatus, setCategorizeStatus] = useState<'idle' | 'loading' | 'suggested' | 'manual'>('idle');
  const [aiErrorInfo, setAiErrorInfo] = useState<{
    code: string;
    status?: number;
    message: string;
  } | null>(null);
  const [failedForText, setFailedForText] = useState<string | null>(null);
  const [showAiErrorDetails, setShowAiErrorDetails] = useState(false);
  const [isChangingCategory, setIsChangingCategory] = useState(false);
  const [isPickerEditMode, setIsPickerEditMode] = useState(false);

  // Picker delete/hide modal state
  const [pendingRemoval, setPendingRemoval] = useState<PendingCategoryRemoval | null>(null);
  const [isRemovingCategory, setIsRemovingCategory] = useState(false);
  const [removeModalError, setRemoveModalError] = useState<string | null>(null);

  // Add subcategory inline state
  const [isAddingSub, setIsAddingSub] = useState(false);
  const [newSubLabel, setNewSubLabel] = useState('');
  const [isCreatingSub, setIsCreatingSub] = useState(false);
  const [subCreateError, setSubCreateError] = useState<string | null>(null);

  const [date, setDate] = useState(() => getManilaDateString());
  const [account, setAccount] = useState(() => activeAccounts[0]?.name || defaultAccount);

  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [insufficientCheck, setInsufficientCheck] = useState<{
    account: AccountWallet;
    availableCentavos: number;
    requiredCentavos: number;
  } | null>(null);
  const [updateBalanceAccount, setUpdateBalanceAccount] = useState<AccountWallet | null>(null);

  const accountSelectRef = useRef<HTMLSelectElement>(null);
  const reqSeqRef = useRef(0);
  const activeAbortRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFetchedTextRef = useRef<string | null>(null);
  const inFlightTextRef = useRef<string | null>(null);
  const firstCategorizationRef = useRef<{
    normalizedText: string;
    hadAmount: boolean;
    confidence: number | null;
    source: 'rule' | 'ai' | 'none';
    hasRerunWithAmount: boolean;
  } | null>(null);

  useEffect(() => {
    if (activeAccounts.length > 0 && !activeAccounts.some((a) => a.name === account)) {
      setAccount(activeAccounts[0].name);
    }
  }, [activeAccounts, account]);

  const parseAmountCentavos = useCallback((amtStr: string): number | null => {
    const parsedAmt = parseFloat(amtStr);
    return !isNaN(parsedAmt) && parsedAmt > 0 ? pesosToCentavos(parsedAmt) : null;
  }, []);

  const isClearedForText = useCallback(
    (desc: string) =>
      clearedForText !== null && normalizeCategorizationText(desc) === clearedForText,
    [clearedForText]
  );

  const isFailedForText = useCallback(
    (desc: string) =>
      failedForText !== null && normalizeCategorizationText(desc) === failedForText,
    [failedForText]
  );

  const runCategorization = useCallback(
    async (
      desc: string,
      amtStr: string,
      forceOrOpts:
        | boolean
        | { force?: boolean; isRetry?: boolean; isAmountRerun?: boolean } = false
    ) => {
      const opts =
        typeof forceOrOpts === 'boolean'
          ? { force: forceOrOpts, isRetry: forceOrOpts, isAmountRerun: false }
          : {
              force: Boolean(forceOrOpts.force),
              isRetry: Boolean(forceOrOpts.isRetry),
              isAmountRerun: Boolean(forceOrOpts.isAmountRerun),
            };
      const trimmed = desc.trim();
      const normalized = normalizeCategorizationText(trimmed);
      if (trimmed.length < 3 || isCategoryOverridden || isClearedForText(trimmed)) return;
      if (!opts.force) {
        if (
          isFailedForText(trimmed) ||
          inFlightTextRef.current === normalized ||
          lastFetchedTextRef.current === normalized
        ) {
          return;
        }
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (activeAbortRef.current && inFlightTextRef.current !== normalized) {
        activeAbortRef.current.abort();
      } else if (opts.force && activeAbortRef.current) {
        activeAbortRef.current.abort();
      }

      const amountCentavos = parseAmountCentavos(amtStr);
      const controller = new AbortController();
      activeAbortRef.current = controller;
      inFlightTextRef.current = normalized;
      const seq = ++reqSeqRef.current;

      setCategorizeStatus('loading');
      setAiErrorInfo(null);
      setShowAiErrorDetails(false);
      if (opts.force) {
        setFailedForText(null);
      }
      setSuggestedNewSubcategory(null);
      setCategoryError(null);

      try {
        const res = await categorizeExpense({
          description: trimmed,
          amountCentavos,
          signal: controller.signal,
          isRetry: opts.isRetry,
        });

        if (seq !== reqSeqRef.current || controller.signal.aborted) return;

        if (res.aiFailed) {
          lastFetchedTextRef.current = null;
          firstCategorizationRef.current = null;
          setFailedForText(normalized);
          setAiErrorInfo({
            code: res.errorCode || 'server_error',
            status: res.errorStatus,
            message: res.errorMessage || 'Could not reach AI service.',
          });
          setShowAiErrorDetails(false);
          setSelectedCategoryId(null);
          setSelectedSubcategoryId(null);
          setCategoryConfidence(null);
          setSubcategoryConfidence(null);
          setSuggestedNewSubcategory(null);
          setCategorizeStatus('manual');
          setIsChangingCategory(true);
          return;
        }

        lastFetchedTextRef.current = normalized;
        if (!opts.isAmountRerun) {
          firstCategorizationRef.current = {
            normalizedText: normalized,
            hadAmount: amountCentavos !== null && amountCentavos > 0,
            confidence: res.categoryConfidence,
            source: res.source,
            hasRerunWithAmount: false,
          };
        }
        setFailedForText(null);
        setAiErrorInfo(null);
        setShowAiErrorDetails(false);

        if (res.needsManualPicker || !res.categoryId) {
          setSelectedCategoryId(null);
          setSelectedSubcategoryId(null);
          setCategoryConfidence(res.categoryConfidence);
          setSubcategoryConfidence(0);
          setSuggestedNewSubcategory(null);
          setCategorizeStatus('manual');
          setIsChangingCategory(true);
        } else {
          setSelectedCategoryId(res.categoryId);
          setSelectedSubcategoryId(useSubcategories ? res.subcategoryId : null);
          setCategoryConfidence(res.categoryConfidence);
          setSubcategoryConfidence(useSubcategories ? res.subcategoryConfidence : 0);
          setSuggestedNewSubcategory(
            useSubcategories && !res.subcategoryId ? res.newSubcategorySuggestion : null
          );
          setCategorizeStatus('suggested');
          if (opts.isAmountRerun) {
            setIsChangingCategory(false);
          }
        }
      } catch (err: any) {
        if (controller.signal.aborted || err?.name === 'AbortError') return;
        if (seq !== reqSeqRef.current) return;
        if (import.meta.env.DEV) {
          console.error('[Chestlist][AddExpenseForm] Categorization error:', err);
        }
        lastFetchedTextRef.current = null;
        setFailedForText(normalized);
        setAiErrorInfo({
          code: 'server_error',
          message: err?.message || 'Unexpected categorization error.',
        });
        setShowAiErrorDetails(false);
        setSelectedCategoryId(null);
        setSelectedSubcategoryId(null);
        setSuggestedNewSubcategory(null);
        setCategorizeStatus('manual');
        setIsChangingCategory(true);
      } finally {
        if (seq === reqSeqRef.current) {
          inFlightTextRef.current = null;
          if (activeAbortRef.current === controller) {
            activeAbortRef.current = null;
          }
        }
      }
    },
    [isCategoryOverridden, isClearedForText, isFailedForText, parseAmountCentavos, useSubcategories]
  );

  // 700 ms debounce while typing when text >= 3 chars
  useEffect(() => {
    const trimmed = title.trim();
    const normalized = normalizeCategorizationText(trimmed);
    if (isCategoryOverridden || isClearedForText(trimmed) || isFailedForText(trimmed)) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (trimmed.length < 3) {
      if (activeAbortRef.current) {
        activeAbortRef.current.abort();
        activeAbortRef.current = null;
      }
      reqSeqRef.current += 1;
      inFlightTextRef.current = null;
      lastFetchedTextRef.current = null;
      firstCategorizationRef.current = null;
      setSelectedCategoryId(null);
      setSelectedSubcategoryId(null);
      setCategoryConfidence(null);
      setSubcategoryConfidence(null);
      setSuggestedNewSubcategory(null);
      setAiErrorInfo(null);
      setFailedForText(null);
      setShowAiErrorDetails(false);
      setCategorizeStatus('idle');
      return;
    }

    if (
      lastFetchedTextRef.current === normalized ||
      inFlightTextRef.current === normalized
    ) {
      return;
    }

    // Cancel any older pending request for a different description
    if (activeAbortRef.current) {
      activeAbortRef.current.abort();
      activeAbortRef.current = null;
      inFlightTextRef.current = null;
    }

    setCategorizeStatus('loading');
    setAiErrorInfo(null);
    setShowAiErrorDetails(false);
    setSuggestedNewSubcategory(null);
    setCategoryError(null);

    debounceTimerRef.current = setTimeout(() => {
      void runCategorization(trimmed, amountStr);
    }, 700);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [title, isCategoryOverridden, isClearedForText, isFailedForText, useSubcategories]);

  // Cleanup active requests/timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (activeAbortRef.current) activeAbortRef.current.abort();
    };
  }, []);

  const triggerImmediateIfNoSuggestion = () => {
    const trimmed = title.trim();
    const normalized = normalizeCategorizationText(trimmed);
    if (
      isCategoryOverridden ||
      isClearedForText(trimmed) ||
      isFailedForText(trimmed) ||
      trimmed.length < 3
    ) {
      return;
    }
    if (
      inFlightTextRef.current === normalized ||
      lastFetchedTextRef.current === normalized
    ) {
      return;
    }
    if (!selectedCategoryId && !aiErrorInfo) {
      void runCategorization(trimmed, amountStr);
    }
  };

  const handleAmountBlur = () => {
    const trimmed = title.trim();
    const normalized = normalizeCategorizationText(trimmed);
    const amtCentavos = parseAmountCentavos(amountStr);
    const meta = firstCategorizationRef.current;
    if (
      trimmed.length < 3 ||
      amtCentavos === null ||
      amtCentavos <= 0 ||
      isCategoryOverridden ||
      isClearedForText(trimmed) ||
      isFailedForText(trimmed) ||
      inFlightTextRef.current === normalized ||
      !meta ||
      meta.normalizedText !== normalized ||
      meta.hadAmount ||
      meta.source === 'rule' ||
      meta.confidence === null ||
      meta.confidence > 0.8 ||
      meta.hasRerunWithAmount
    ) {
      return;
    }
    meta.hasRerunWithAmount = true;
    void runCategorization(trimmed, amountStr, {
      force: true,
      isRetry: false,
      isAmountRerun: true,
    });
  };

  const selectedCategory =
    activeCategories.find((c) => c.id === selectedCategoryId) || null;
  const selectedSubcategory =
    useSubcategories && selectedCategory && selectedSubcategoryId
      ? selectedCategory.subcategories.find(
          (s) => !s.isArchived && s.id === selectedSubcategoryId
        ) || null
      : null;

  const handleClearPrimaryCategory = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (activeAbortRef.current) {
      activeAbortRef.current.abort();
      activeAbortRef.current = null;
    }
    reqSeqRef.current += 1;
    inFlightTextRef.current = null;
    firstCategorizationRef.current = null;
    setSelectedCategoryId(null);
    setSelectedSubcategoryId(null);
    setCategoryConfidence(null);
    setSubcategoryConfidence(null);
    setSuggestedNewSubcategory(null);
    setCategoryError(null);
    setAiErrorInfo(null);
    setFailedForText(null);
    setShowAiErrorDetails(false);
    setIsCategoryOverridden(false);
    const normalized = normalizeCategorizationText(title);
    setClearedForText(normalized || null);
    setCategorizeStatus('manual');
    setIsAddingSub(false);
    setNewSubLabel('');
    setSubCreateError(null);
  };

  const handleSelectPrimaryCategory = (cat: ExpenseCategory) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (activeAbortRef.current) {
      activeAbortRef.current.abort();
      activeAbortRef.current = null;
    }
    inFlightTextRef.current = null;
    const isSame = selectedCategoryId === cat.id;
    setSelectedCategoryId(cat.id);
    if (!isSame) {
      setSelectedSubcategoryId(null);
      setSubcategoryConfidence(0);
    }
    setCategoryConfidence(1.0);
    setIsCategoryOverridden(true);
    setClearedForText(null);
    setFailedForText(null);
    setSuggestedNewSubcategory(null);
    setAiErrorInfo(null);
    setShowAiErrorDetails(false);
    setCategorizeStatus('suggested');
    setCategoryError(null);
    setIsAddingSub(false);
    setSubCreateError(null);

    const hasActiveSubs = cat.subcategories.some((s) => !s.isArchived);
    if (!useSubcategories || !hasActiveSubs) {
      setIsChangingCategory(false);
      setIsPickerEditMode(false);
    }
  };

  const handleSelectSubcategory = (subId: string) => {
    setSelectedSubcategoryId(subId);
    setSubcategoryConfidence(1.0);
    setIsCategoryOverridden(true);
    setClearedForText(null);
    setFailedForText(null);
    setSuggestedNewSubcategory(null);
    setAiErrorInfo(null);
    setShowAiErrorDetails(false);
    setCategorizeStatus('suggested');
    setCategoryError(null);
    setIsChangingCategory(false);
    setIsPickerEditMode(false);
  };

  const handleCreateSubcategory = async (labelToCreate: string) => {
    if (!selectedCategory) return;
    const cleaned = labelToCreate.trim().replace(/\s+/g, ' ').slice(0, 24).trim();
    if (!cleaned) {
      setSubCreateError('Enter a subcategory name.');
      return;
    }
    try {
      setIsCreatingSub(true);
      setSubCreateError(null);
      const created = await createSubcategory(selectedCategory.id, cleaned);
      setSelectedSubcategoryId(created.id);
      setSubcategoryConfidence(1.0);
      setIsCategoryOverridden(true);
      setClearedForText(null);
      setSuggestedNewSubcategory(null);
      setCategorizeStatus('suggested');
      setNewSubLabel('');
      setIsAddingSub(false);
      await (onCategoriesChanged || onSubcategoryCreated)?.();
    } catch (err) {
      setSubCreateError(getUserSafeErrorMessage(err));
    } finally {
      setIsCreatingSub(false);
    }
  };

  const handleInitiateRemovePrimary = async (cat: ExpenseCategory) => {
    if (cat.key === 'others') return;
    setRemoveModalError(null);
    const [expenseCount, rules] = await Promise.all([
      getCategoryExpenseCount(cat.id),
      getLearnedRules(),
    ]);
    const learnedRuleCount = rules.filter((r) => r.categoryId === cat.id).length;
    setPendingRemoval({
      kind: 'category',
      category: cat,
      expenseCount,
      learnedRuleCount,
    });
  };

  const handleInitiateRemoveSub = async (
    parentCat: ExpenseCategory,
    sub: ExpenseSubcategory
  ) => {
    setRemoveModalError(null);
    const [expenseCount, rules] = await Promise.all([
      getSubcategoryExpenseCount(sub.id),
      getLearnedRules(),
    ]);
    const learnedRuleCount = rules.filter((r) => r.subcategoryId === sub.id).length;
    setPendingRemoval({
      kind: 'subcategory',
      parentCategory: parentCat,
      subId: sub.id,
      subLabel: sub.label,
      isSystemDefault: sub.userId === null,
      expenseCount,
      learnedRuleCount,
    });
  };

  const handleConfirmRemoval = async (payload: CategoryDeleteConfirmPayload) => {
    if (!pendingRemoval) return;
    setIsRemovingCategory(true);
    setRemoveModalError(null);
    try {
      const movedExpenses = pendingRemoval.expenseCount > 0 && !payload.keepExistingOnExpenses;
      if (pendingRemoval.kind === 'category') {
        const wasSystem = pendingRemoval.category.userId === null;
        await removeOrHideCategory(
          pendingRemoval.category.id,
          payload.moveToTargetId || undefined,
          {
            keepExistingOnExpenses: payload.keepExistingOnExpenses,
            learnedRuleAction: payload.learnedRuleAction,
          }
        );
        if (selectedCategoryId === pendingRemoval.category.id) {
          setSelectedCategoryId(null);
          setSelectedSubcategoryId(null);
          setIsCategoryOverridden(false);
          setCategorizeStatus('manual');
        }
        setPendingRemoval(null);
        await (onCategoriesChanged || onSubcategoryCreated)?.();
        showToast?.(
          movedExpenses
            ? 'Expenses moved.'
            : wasSystem
            ? 'Category hidden.'
            : 'Category deleted.'
        );
      } else {
        const wasSystem = pendingRemoval.isSystemDefault;
        await removeSubcategory(pendingRemoval.subId, payload.moveToTargetId, {
          keepExistingOnExpenses: payload.keepExistingOnExpenses,
          learnedRuleAction: payload.learnedRuleAction,
        });
        if (selectedSubcategoryId === pendingRemoval.subId) {
          setSelectedSubcategoryId(null);
        }
        setPendingRemoval(null);
        await (onCategoriesChanged || onSubcategoryCreated)?.();
        showToast?.(
          movedExpenses
            ? 'Expenses moved.'
            : wasSystem
            ? 'Subcategory hidden.'
            : 'Subcategory deleted.'
        );
      }
    } catch (err) {
      setRemoveModalError(getUserSafeErrorMessage(err));
    } finally {
      setIsRemovingCategory(false);
    }
  };

  const selectedAccount = activeAccounts.find((a) => a.name === account) || null;
  const parsedAmountNum = parseFloat(amountStr);
  const currentAmountCentavos =
    !isNaN(parsedAmountNum) && parsedAmountNum > 0 ? pesosToCentavos(parsedAmountNum) : 0;
  const exceedsAccountBalance = Boolean(
    selectedAccount && currentAmountCentavos > selectedAccount.balanceCentavos
  );

  const performSave = async (allowOverdraft = false) => {
    const numericAmount = parseFloat(amountStr);
    if (!title.trim() || !amountStr.trim() || isNaN(numericAmount) || numericAmount <= 0) {
      return;
    }

    let finalCategory = selectedCategory;
    let finalSubcategory = selectedSubcategory;
    let finalCatConf = categoryConfidence;
    let finalSubConf = subcategoryConfidence;

    // Never block Add expense on pending AI categorization; cancel in-flight suggestion and save immediately
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (activeAbortRef.current) {
      activeAbortRef.current.abort();
      activeAbortRef.current = null;
    }
    reqSeqRef.current += 1;
    inFlightTextRef.current = null;

    // If still uncategorized (e.g., cleared by user or AI unsure), default to Others and mark confirmed
    let savedAsUnselectedOthers = false;
    if (!finalCategory) {
      finalCategory =
        activeCategories.find((c) => c.key === 'others') ||
        categories.find((c) => c.key === 'others') ||
        DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1];
      finalSubcategory = null;
      savedAsUnselectedOthers = true;
    }

    const centavos = pesosToCentavos(numericAmount);
    try {
      setIsLoading(true);
      setHasError(false);
      setTitleError(null);
      setAmountError(null);
      setCategoryError(null);
      setFeedbackMessage(null);

      await onExpenseAdded({
        title: title.trim(),
        amountCentavos: centavos,
        category: finalCategory.label,
        categoryId: finalCategory.id,
        subcategoryId: useSubcategories ? finalSubcategory?.id || null : null,
        subcategoryLabel: useSubcategories ? finalSubcategory?.label || null : null,
        categoryConfidence: savedAsUnselectedOthers ? null : finalCatConf,
        subcategoryConfidence: useSubcategories && !savedAsUnselectedOthers ? finalSubConf : null,
        categoryUserConfirmed: isCategoryOverridden || savedAsUnselectedOthers,
        date,
        account,
        ...(allowOverdraft ? { allowOverdraft: true } : {}),
      });

      if (isCategoryOverridden) {
        await saveLearnedRule(
          title.trim(),
          finalCategory.id,
          useSubcategories ? finalSubcategory?.id || null : null
        );
      }

      setInsufficientCheck(null);
      // Reset form cleanly
      reqSeqRef.current += 1;
      inFlightTextRef.current = null;
      lastFetchedTextRef.current = null;
      firstCategorizationRef.current = null;
      setTitle('');
      setAmountStr('');
      setSelectedCategoryId(null);
      setSelectedSubcategoryId(null);
      setCategoryConfidence(null);
      setSubcategoryConfidence(null);
      setSuggestedNewSubcategory(null);
      setAiErrorInfo(null);
      setFailedForText(null);
      setShowAiErrorDetails(false);
      setCategorizeStatus('idle');
      setIsCategoryOverridden(false);
      setClearedForText(null);
      setIsChangingCategory(false);
      setIsPickerEditMode(false);
      setIsAddingSub(false);
      setNewSubLabel('');
      setFeedbackMessage('Expense added.');

      setTimeout(() => {
        setFeedbackMessage(null);
      }, 3500);
    } catch (err) {
      if (err instanceof InsufficientFundsError && selectedAccount && !allowOverdraft) {
        setInsufficientCheck({
          account: selectedAccount,
          availableCentavos: err.details.available,
          requiredCentavos: err.details.required,
        });
        return;
      }
      console.error('[Chestlist][AddExpenseForm]', err);
      setInsufficientCheck(null);
      setHasError(true);
      setFeedbackMessage(getUserSafeErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    let isValid = true;
    if (!title.trim()) {
      setTitleError('Please enter what you bought.');
      isValid = false;
    }

    const numericAmount = parseFloat(amountStr);
    if (!amountStr.trim() || isNaN(numericAmount) || numericAmount <= 0) {
      setAmountError('Enter an amount greater than ₱0.');
      isValid = false;
    }

    if (!isValid) return;

    const centavos = pesosToCentavos(numericAmount);
    if (selectedAccount && centavos > selectedAccount.balanceCentavos) {
      setInsufficientCheck({
        account: selectedAccount,
        availableCentavos: selectedAccount.balanceCentavos,
        requiredCentavos: centavos,
      });
      return;
    }

    await performSave(false);
  };

  return (
    <div className="chest-card p-5 sm:p-6 w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-[var(--color-text)]">Add Expense</h2>
          <p className="text-xs text-[var(--color-muted)]">
            Log your daily spending with automatic smart category matching
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Title input */}
        <div>
          <label
            htmlFor="expense-title"
            className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1.5"
          >
            What did you buy?
          </label>
          <div className="relative">
            <input
              id="expense-title"
              type="text"
              placeholder="e.g. Kare kare, Jeepney fare, Potato Corner, Milk tea..."
              value={title}
              aria-invalid={titleError ? 'true' : 'false'}
              onChange={(e) => {
                const val = e.target.value;
                const nextNormalized = normalizeCategorizationText(val);
                setTitle(val);
                if (val.trim()) {
                  setTitleError(null);
                  if (clearedForText !== null && nextNormalized !== clearedForText) {
                    setClearedForText(null);
                  }
                  if (failedForText !== null && nextNormalized !== failedForText) {
                    setFailedForText(null);
                    setAiErrorInfo(null);
                    setShowAiErrorDetails(false);
                  }
                  if (lastFetchedTextRef.current !== null && nextNormalized !== lastFetchedTextRef.current) {
                    lastFetchedTextRef.current = null;
                  }
                  if (
                    firstCategorizationRef.current !== null &&
                    nextNormalized !== firstCategorizationRef.current.normalizedText
                  ) {
                    firstCategorizationRef.current = null;
                  }
                } else {
                  // Empty description -> category must be empty
                  if (debounceTimerRef.current) {
                    clearTimeout(debounceTimerRef.current);
                    debounceTimerRef.current = null;
                  }
                  if (activeAbortRef.current) {
                    activeAbortRef.current.abort();
                    activeAbortRef.current = null;
                  }
                  reqSeqRef.current += 1;
                  inFlightTextRef.current = null;
                  lastFetchedTextRef.current = null;
                  firstCategorizationRef.current = null;
                  setSelectedCategoryId(null);
                  setSelectedSubcategoryId(null);
                  setCategoryConfidence(null);
                  setSubcategoryConfidence(null);
                  setSuggestedNewSubcategory(null);
                  setIsCategoryOverridden(false);
                  setClearedForText(null);
                  setAiErrorInfo(null);
                  setFailedForText(null);
                  setShowAiErrorDetails(false);
                  setCategorizeStatus('idle');
                }
                if (hasError) setHasError(false);
              }}
              onBlur={triggerImmediateIfNoSuggestion}
              onKeyDown={(e) => {
                if (
                  e.key === 'Enter' &&
                  !selectedCategoryId &&
                  title.trim().length >= 3 &&
                  !isClearedForText(title) &&
                  !isFailedForText(title)
                ) {
                  e.preventDefault();
                  const normalized = normalizeCategorizationText(title);
                  if (
                    inFlightTextRef.current !== normalized &&
                    lastFetchedTextRef.current !== normalized
                  ) {
                    void runCategorization(title, amountStr);
                  }
                }
              }}
              className={`chest-input w-full px-3.5 py-2.5 text-sm ${
                titleError ? 'border-[#A84255] focus:border-[#A84255]' : ''
              }`}
            />
          </div>
          {titleError && (
            <p className="mt-1.5 text-xs text-[#A84255] flex items-center gap-1 font-medium animate-in fade-in" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{titleError}</span>
            </p>
          )}

          {/* AI error line with Retry and dev-only Details link */}
          {aiErrorInfo && !isCategoryOverridden && !isClearedForText(title) && (
            <div className="mt-1.5 space-y-1 animate-in fade-in">
              <p className="text-xs text-[var(--color-muted)] flex flex-wrap items-center gap-2">
                <span>
                  {aiErrorInfo.code === 'quota_exceeded' || aiErrorInfo.status === 429
                    ? 'AI is busy right now. Pick a category below.'
                    : 'Could not reach AI right now. Pick a category below.'}
                </span>
                <button
                  type="button"
                  onClick={() => void runCategorization(title, amountStr, true)}
                  className="font-semibold text-[var(--color-primary)] hover:underline cursor-pointer"
                >
                  Retry
                </button>
                {import.meta.env.DEV && (
                  <button
                    type="button"
                    onClick={() => setShowAiErrorDetails((prev) => !prev)}
                    className="font-medium text-[var(--color-muted)] hover:text-[var(--color-text)] underline cursor-pointer"
                  >
                    Details
                  </button>
                )}
              </p>
              {import.meta.env.DEV && showAiErrorDetails && (
                <p className="text-[11px] font-mono text-[var(--color-muted)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[8px] px-2.5 py-1">
                  {aiErrorInfo.code}
                  {typeof aiErrorInfo.status === 'number' && aiErrorInfo.status > 0
                    ? ` (HTTP ${aiErrorInfo.status})`
                    : ''}
                  {aiErrorInfo.message ? ` — ${aiErrorInfo.message}` : ''}
                </p>
              )}
            </div>
          )}

          {/* Category suggestion pill / skeleton with sparkle icon / Clear & Change link */}
          <div className="flex flex-wrap items-center gap-2 mt-2.5 min-h-[28px]">
            <span className="text-xs text-[var(--color-muted)]">Category:</span>

            {categorizeStatus === 'loading' && !isCategoryOverridden ? (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200/80 animate-pulse"
                aria-label="Suggesting category"
              >
                <Sparkles className="w-3 h-3 text-[var(--color-primary)]" />
                <span className="inline-block h-3 w-24 rounded-full bg-slate-300/70" />
              </span>
            ) : selectedCategory ? (
              <div
                key={`${selectedCategory.id}-${selectedSubcategory?.id || 'none'}-${isCategoryOverridden}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shadow-xs border border-black/10 animate-suggestion-pop"
                style={{
                  backgroundColor: selectedCategory.color,
                  color: '#3A2E33',
                }}
              >
                {!isCategoryOverridden && <Sparkles className="w-3 h-3 shrink-0" />}
                <span>
                  {isCategoryOverridden ? '' : 'Suggested: '}
                  {selectedCategory.icon} {selectedCategory.label}
                  {useSubcategories && selectedSubcategory
                    ? ` › ${selectedSubcategory.label}`
                    : ''}
                </span>
                <button
                  type="button"
                  onClick={handleClearPrimaryCategory}
                  aria-label="Clear category"
                  title="Clear category"
                  className="ml-0.5 w-4 h-4 rounded-full inline-flex items-center justify-center hover:bg-black/10 transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <span className="text-xs text-[var(--color-muted)] italic">
                {categorizeStatus === 'manual'
                  ? 'Not sure yet — pick below'
                  : 'Will suggest as you type'}
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                const nextOpen = !isChangingCategory;
                setIsChangingCategory(nextOpen);
                if (!nextOpen) setIsPickerEditMode(false);
                setCategoryError(null);
              }}
              className="text-xs font-medium text-[var(--color-primary)] hover:underline cursor-pointer"
            >
              {isChangingCategory
                ? 'Done'
                : selectedCategory
                ? 'Change'
                : 'Pick category'}
            </button>
          </div>

          {/* Suggested new subcategory tappable pill (never auto-created) */}
          {useSubcategories &&
            selectedCategory &&
            !selectedSubcategory &&
            suggestedNewSubcategory && (
              <div className="mt-2">
                <button
                  type="button"
                  disabled={isCreatingSub}
                  onClick={() => void handleCreateSubcategory(suggestedNewSubcategory)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-dashed border-[var(--color-primary)] bg-[var(--color-container)]/35 hover:bg-[var(--color-container)]/65 text-[#3A2E33] transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                  <span>
                    Add '{suggestedNewSubcategory}' under {selectedCategory.label}?
                  </span>
                </button>
              </div>
            )}

          {categoryError && (
            <p className="mt-1.5 text-xs text-[#A84255] flex items-center gap-1 font-medium animate-in fade-in" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{categoryError}</span>
            </p>
          )}

          {/* Manual Primary + Subcategory Picker */}
          {isChangingCategory && (
            <div className="mt-2.5 p-3.5 rounded-[14px] bg-[var(--color-container)]/25 border border-[var(--color-border)] animate-in fade-in duration-150 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-[var(--color-muted)] uppercase">
                  Primary category:
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-pressed={isPickerEditMode}
                    onClick={() => setIsPickerEditMode(!isPickerEditMode)}
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-[8px] border transition-colors cursor-pointer ${
                      isPickerEditMode
                        ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                        : 'bg-white text-[var(--color-text)] border-[var(--color-border)] hover:border-[var(--color-primary)]/60'
                    }`}
                  >
                    <Pencil className="w-3 h-3" />
                    <span>{isPickerEditMode ? 'Editing' : 'Edit'}</span>
                  </button>
                  {onOpenManageCategories && (
                    <button
                      type="button"
                      onClick={onOpenManageCategories}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-primary)] hover:underline cursor-pointer"
                    >
                      <SlidersHorizontal className="w-3 h-3" />
                      <span>Manage categories</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {activeCategories.map((cat) => {
                  const isSelected = selectedCategoryId === cat.id;
                  const canRemoveOrHide = cat.key !== 'others';
                  const isSystemDefault = cat.userId === null;
                  return (
                    <div
                      key={cat.id}
                      className={`rounded-full text-xs font-semibold transition-all border inline-flex items-center ${
                        isSelected
                          ? 'ring-2 ring-[var(--color-primary)] shadow-xs scale-105 border-black/15'
                          : 'opacity-90 hover:opacity-100 border-black/5'
                      }`}
                      style={{
                        backgroundColor: cat.color,
                        color: '#3A2E33',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectPrimaryCategory(cat)}
                        className={`py-1 inline-flex items-center gap-1 cursor-pointer ${
                          isPickerEditMode && canRemoveOrHide ? 'pl-2.5 pr-1.5' : 'px-2.5'
                        }`}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </button>
                      {isPickerEditMode && canRemoveOrHide && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleInitiateRemovePrimary(cat);
                          }}
                          aria-label={isSystemDefault ? `Hide ${cat.label}` : `Delete ${cat.label}`}
                          title={isSystemDefault ? `Hide ${cat.label}` : `Delete ${cat.label}`}
                          className="pr-2 pl-1 py-1 rounded-r-full text-[#A84255] hover:bg-black/10 transition-colors cursor-pointer inline-flex items-center"
                        >
                          {isSystemDefault ? (
                            <EyeOff className="w-3 h-3" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Subcategories for selected primary category */}
              {useSubcategories && selectedCategory && (
                <div className="pt-2.5 border-t border-[var(--color-border)]/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[var(--color-muted)] uppercase">
                      Subcategory ({selectedCategory.label}):
                    </span>
                    {selectedSubcategoryId && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSubcategoryId(null);
                          setSubcategoryConfidence(0);
                          setIsCategoryOverridden(true);
                        }}
                        className="text-[11px] text-[var(--color-muted)] hover:underline cursor-pointer"
                      >
                        Clear subcategory
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {selectedCategory.subcategories
                      .filter((s) => !s.isArchived)
                      .map((sub) => {
                        const isSubSelected = selectedSubcategoryId === sub.id;
                        const isSystemSub = sub.userId === null;
                        return (
                          <div
                            key={sub.id}
                            className={`rounded-full text-xs font-medium transition-all border inline-flex items-center ${
                              isSubSelected
                                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-xs'
                                : 'bg-white text-[var(--color-text)] border-[var(--color-border)] hover:border-[var(--color-primary)]/60'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleSelectSubcategory(sub.id)}
                              className={`py-1 cursor-pointer ${
                                isPickerEditMode ? 'pl-2.5 pr-1.5' : 'px-2.5'
                              }`}
                            >
                              {sub.label}
                            </button>
                            {isPickerEditMode && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleInitiateRemoveSub(selectedCategory, sub);
                                }}
                                aria-label={isSystemSub ? `Hide ${sub.label}` : `Delete ${sub.label}`}
                                title={isSystemSub ? `Hide ${sub.label}` : `Delete ${sub.label}`}
                                className={`pr-2 pl-1 py-1 rounded-r-full transition-colors cursor-pointer inline-flex items-center ${
                                  isSubSelected
                                    ? 'text-white/90 hover:bg-white/20'
                                    : 'text-[#A84255] hover:bg-rose-50'
                                }`}
                              >
                                {isSystemSub ? (
                                  <EyeOff className="w-3 h-3" />
                                ) : (
                                  <Trash2 className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                        );
                      })}

                    {!isAddingSub && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingSub(true);
                          setSubCreateError(null);
                        }}
                        className="px-2.5 py-1 rounded-full text-xs font-semibold border border-dashed border-[var(--color-primary)] text-[var(--color-primary)] bg-white hover:bg-[var(--color-container)]/30 transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add subcategory</span>
                      </button>
                    )}
                  </div>

                  {isAddingSub && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={newSubLabel}
                        onChange={(e) => {
                          setNewSubLabel(e.target.value);
                          setSubCreateError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void handleCreateSubcategory(newSubLabel);
                          }
                        }}
                        maxLength={24}
                        placeholder="New subcategory (max 24 chars)..."
                        className="chest-input flex-1 min-w-[160px] px-2.5 py-1.5 text-xs"
                        autoFocus
                      />
                      <button
                        type="button"
                        disabled={isCreatingSub || !newSubLabel.trim()}
                        onClick={() => void handleCreateSubcategory(newSubLabel)}
                        className="px-3 py-1.5 rounded-[10px] bg-[var(--color-primary)] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                      >
                        {isCreatingSub ? 'Adding...' : 'Add'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingSub(false);
                          setNewSubLabel('');
                          setSubCreateError(null);
                        }}
                        className="text-xs text-[var(--color-muted)] hover:underline cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {subCreateError && (
                    <p className="text-xs text-[#A84255] font-medium" role="alert">
                      {subCreateError}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Amount & Date inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label
              htmlFor="expense-amount"
              className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1.5"
            >
              Amount (PHP)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--color-muted)] tabular-numbers">
                ₱
              </span>
              <input
                id="expense-amount"
                type="number"
                step="any"
                min="1"
                placeholder="0.00"
                value={amountStr}
                aria-invalid={amountError ? 'true' : 'false'}
                onFocus={triggerImmediateIfNoSuggestion}
                onBlur={handleAmountBlur}
                onChange={(e) => {
                  const val = e.target.value;
                  setAmountStr(val);
                  const num = parseFloat(val);
                  if (!isNaN(num) && num > 0) {
                    setAmountError(null);
                  }
                }}
                className={`chest-input w-full pl-8 pr-3.5 py-2.5 text-sm tabular-numbers font-medium ${
                  amountError ? 'border-[#A84255] focus:border-[#A84255]' : ''
                }`}
              />
            </div>
            {amountError && (
              <p className="mt-1.5 text-xs text-[#A84255] flex items-center gap-1 font-medium animate-in fade-in" role="alert">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{amountError}</span>
              </p>
            )}
            {exceedsAccountBalance && selectedAccount && !amountError && (
              <p className="mt-1.5 text-xs text-[#C26910] flex items-center gap-1 font-medium animate-in fade-in" role="status">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  This is more than the {formatPHP(selectedAccount.balanceCentavos)} in {selectedAccount.name}.
                </span>
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="expense-date"
              className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1.5"
            >
              Date
            </label>
            <input
              id="expense-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="chest-input w-full px-3.5 py-2.5 text-sm"
            />
          </div>
        </div>

        {/* Account selector */}
        <div>
          <label
            htmlFor="expense-account"
            className="block text-xs font-semibold text-[var(--color-text)] uppercase tracking-wider mb-1.5"
          >
            Paid via Account
          </label>
          <select
            ref={accountSelectRef}
            id="expense-account"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            className="chest-input w-full px-3.5 py-2.5 text-sm cursor-pointer"
          >
            {activeAccounts.length > 0 ? (
              activeAccounts.map((acc) => (
                <option key={acc.id} value={acc.name}>
                  {acc.name} ({fromDbAccountType(acc.type)}) · {formatPHP(acc.balanceCentavos)}
                </option>
              ))
            ) : (
              <>
                <option value="GCash">GCash (E-wallet)</option>
                <option value="Maya">Maya (E-wallet)</option>
                <option value="BPI Savings">BPI Savings (Bank)</option>
                <option value="Cash">Cash (Cash stash)</option>
              </>
            )}
          </select>
        </div>

        {/* Action Button & Feedback */}
        <div className="pt-1 space-y-2">
          <button
            type="submit"
            disabled={isLoading || !title.trim() || !amountStr}
            className="chest-button-primary w-full py-3 px-4 font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving expense...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" strokeWidth={2} />
                <span>Add expense</span>
              </>
            )}
          </button>
          <p className="text-[11px] text-[var(--color-muted)] text-center">
            {CATEGORY_PRIVACY_TEXT}
          </p>
        </div>

        {feedbackMessage && (
          <div
            className={`p-3 rounded-[12px] text-xs flex items-center justify-between transition-all ${
              hasError
                ? 'bg-rose-50 border border-rose-200 text-rose-800'
                : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {hasError ? (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span className="font-medium">{feedbackMessage}</span>
            </div>

            {hasError && (
              <button
                type="button"
                onClick={() => handleSubmit()}
                className="px-2.5 py-1 rounded-[8px] bg-rose-600 text-white font-medium hover:bg-rose-700 transition-colors cursor-pointer"
              >
                Retry
              </button>
            )}
          </div>
        )}
      </form>

      <CategoryDeleteModal
        pending={pendingRemoval}
        activeCategories={activeCategories}
        isSubmitting={isRemovingCategory}
        errorMsg={removeModalError}
        onCancel={() => {
          setPendingRemoval(null);
          setRemoveModalError(null);
        }}
        onConfirm={handleConfirmRemoval}
      />

      <InsufficientBalanceModal
        isOpen={Boolean(insufficientCheck)}
        account={insufficientCheck?.account || null}
        availableCentavos={insufficientCheck?.availableCentavos || 0}
        requiredCentavos={insufficientCheck?.requiredCentavos || 0}
        kindLabel="expense"
        isSubmitting={isLoading}
        onChooseAnotherAccount={() => {
          setInsufficientCheck(null);
          setTimeout(() => {
            accountSelectRef.current?.focus();
          }, 0);
        }}
        onUpdateBalanceFirst={() => {
          if (!insufficientCheck) return;
          const accToUpdate = insufficientCheck.account;
          setInsufficientCheck(null);
          setUpdateBalanceAccount(accToUpdate);
        }}
        onAddAnyway={() => {
          void performSave(true);
        }}
        onCancel={() => setInsufficientCheck(null)}
      />

      <UpdateBalanceModal
        account={updateBalanceAccount}
        isOpen={Boolean(updateBalanceAccount)}
        onClose={() => setUpdateBalanceAccount(null)}
        onUpdateBalance={onUpdateBalance || apiUpdateAccountBalance}
        zIndexClass="z-[60]"
      />
    </div>
  );
};
