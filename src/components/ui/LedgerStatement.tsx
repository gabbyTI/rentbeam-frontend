import React, { useEffect, useState, useCallback } from 'react';
import { LedgerEntry, LedgerSummary } from '../../types';
import {
  fetchLedgerStatement,
  fetchLedgerBalance,
  postLedgerCharge,
  postLedgerPayment,
  postLedgerCredit,
} from '../../services/api';
import { Card, CardHeader, CardContent } from './Card';
import { Button } from './Button';
import { Modal } from './Modal';
import { Input, Select } from './Input';
import { useToast } from '../../context/ToastContext';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number | null | undefined): string => {
  if (n === null || n === undefined) return '';
  return new Intl.NumberFormat('en-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
};

const fmtBalance = (n: number): string => {
  const abs = Math.abs(n);
  const formatted = new Intl.NumberFormat('en-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);
  return n < 0 ? `(${formatted})` : formatted;
};

const fmtDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

// ─── Types ────────────────────────────────────────────────────────────────────

interface LedgerStatementProps {
  tenantMembershipId: string;
  isLandlord?: boolean;
  tenantName?: string;
}

const CHARGE_CODES = [
  { value: 'RNTA', label: 'RNTA – Apartment Rent' },
  { value: 'FEE', label: 'FEE – Fee' },
  { value: 'DEPO', label: 'DEPO – Deposit' },
  { value: 'CONC', label: 'CONC – Concession' },
  { value: 'ADJ', label: 'ADJ – Adjustment' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export const LedgerStatement: React.FC<LedgerStatementProps> = ({
  tenantMembershipId,
  isLandlord = false,
  tenantName,
}) => {
  const { showToast } = useToast();

  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Post charge modal
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [chargeCode, setChargeCode] = useState('RNTA');
  const [chargeDesc, setChargeDesc] = useState('');
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeDate, setChargeDate] = useState(new Date().toISOString().split('T')[0]);
  const [postingCharge, setPostingCharge] = useState(false);

  // Post payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentDesc, setPaymentDesc] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [postingPayment, setPostingPayment] = useState(false);

  // Post credit modal
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [creditDesc, setCreditDesc] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditDate, setCreditDate] = useState(new Date().toISOString().split('T')[0]);
  const [postingCredit, setPostingCredit] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [rows, bal] = await Promise.all([
        fetchLedgerStatement(tenantMembershipId),
        fetchLedgerBalance(tenantMembershipId),
      ]);
      setEntries(rows);
      setSummary(bal);
    } catch (err: any) {
      showToast(err.message || 'Failed to load ledger', 'error');
    } finally {
      setLoading(false);
    }
  }, [tenantMembershipId]);

  useEffect(() => { load(); }, [load]);

  // ── Post charge ─────────────────────────────────────────────────────────────
  const handlePostCharge = async () => {
    const amount = parseFloat(chargeAmount);
    if (!chargeDesc.trim() || isNaN(amount) || amount <= 0) {
      showToast('Enter a valid description and amount', 'error');
      return;
    }
    try {
      setPostingCharge(true);
      await postLedgerCharge(tenantMembershipId, {
        code: chargeCode,
        description: chargeDesc,
        amount,
        effectiveDate: chargeDate,
      });
      showToast('Charge posted', 'success');
      setShowChargeModal(false);
      setChargeDesc('');
      setChargeAmount('');
      setChargeDate(new Date().toISOString().split('T')[0]);
      await load();
    } catch (err: any) {
      showToast(err.message || 'Failed to post charge', 'error');
    } finally {
      setPostingCharge(false);
    }
  };

  // ── Post payment ────────────────────────────────────────────────────────────
  const handlePostPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (!paymentDesc.trim() || isNaN(amount) || amount <= 0) {
      showToast('Enter a valid description and amount', 'error');
      return;
    }
    try {
      setPostingPayment(true);
      await postLedgerPayment(tenantMembershipId, {
        description: paymentDesc,
        amount,
        effectiveDate: paymentDate,
      });
      showToast('Payment posted', 'success');
      setShowPaymentModal(false);
      setPaymentDesc('');
      setPaymentAmount('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      await load();
    } catch (err: any) {
      showToast(err.message || 'Failed to post payment', 'error');
    } finally {
      setPostingPayment(false);
    }
  };

  // ── Post credit ─────────────────────────────────────────────────────────────
  const handlePostCredit = async () => {
    const amount = parseFloat(creditAmount);
    if (!creditDesc.trim() || isNaN(amount) || amount <= 0) {
      showToast('Enter a valid description and amount', 'error');
      return;
    }
    try {
      setPostingCredit(true);
      await postLedgerCredit(tenantMembershipId, {
        code: 'CONC',
        description: creditDesc,
        amount,
        effectiveDate: creditDate,
      });
      showToast('Credit posted', 'success');
      setShowCreditModal(false);
      setCreditDesc('');
      setCreditAmount('');
      setCreditDate(new Date().toISOString().split('T')[0]);
      await load();
    } catch (err: any) {
      showToast(err.message || 'Failed to post credit', 'error');
    } finally {
      setPostingCredit(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const balanceColor = summary
    ? summary.currentBalance > 0
      ? 'text-red-600'
      : summary.currentBalance < 0
      ? 'text-green-600'
      : 'text-gray-700'
    : 'text-gray-700';

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">Current Balance</p>
              <p className={`text-2xl font-bold ${balanceColor}`}>
                {summary
                  ? summary.currentBalance < 0
                    ? `(${fmt(Math.abs(summary.currentBalance))}) CR`
                    : `$${fmt(summary.currentBalance)}`
                  : '—'}
              </p>
              {summary?.currentBalance !== undefined && summary.currentBalance < 0 && (
                <p className="text-xs text-green-600 mt-0.5">Tenant has a credit on account</p>
              )}
            </div>
            <div className="flex gap-3 text-sm text-gray-500">
              <div>
                <p>Total Charged</p>
                <p className="font-semibold text-gray-800">${fmt(summary?.totalCharged)}</p>
              </div>
              <div>
                <p>Total Paid</p>
                <p className="font-semibold text-gray-800">${fmt(summary?.totalPaid)}</p>
              </div>
            </div>
            {isLandlord && (
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setShowChargeModal(true)}>
                  + Charge
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setShowPaymentModal(true)}>
                  + Payment
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setShowCreditModal(true)}>
                  + Credit
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Statement table */}
      <Card>
        <CardHeader>
          <h3 className="text-base font-semibold text-gray-900">
            {tenantName ? `${tenantName} — Resident Ledger` : 'Resident Ledger'}
          </h3>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-t-transparent border-primary-600 rounded-full animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-center text-gray-400 py-10">No ledger entries yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 w-28">Date</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 w-20">Code</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Description</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600 w-28">Charge</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600 w-28">Payment</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600 w-28">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {entries.map((entry) => {
                    const isCharge = entry.type === 'CHARGE';
                    const isPayment = entry.type === 'PAYMENT';
                    const isCredit = entry.type === 'CREDIT';
                    const isNegBal = entry.balanceAfter < 0;

                    return (
                      <tr
                        key={entry.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        {/* Date */}
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {fmtDate(entry.effectiveDate)}
                        </td>

                        {/* Code — only for charges */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {entry.code ? (
                            <span className="inline-block px-2 py-0.5 text-xs font-mono font-semibold bg-gray-100 text-gray-700 rounded">
                              {entry.code}
                            </span>
                          ) : null}
                        </td>

                        {/* Description */}
                        <td className="px-4 py-3 text-gray-800">
                          {entry.description}
                          {entry.status === 'REVERSED' && (
                            <span className="ml-2 text-xs text-red-400">[reversed]</span>
                          )}
                        </td>

                        {/* Charge column */}
                        <td className="px-4 py-3 text-right font-mono">
                          {isCharge && entry.chargeAmount !== null ? (
                            <span className="text-gray-900">{fmt(entry.chargeAmount)}</span>
                          ) : isCredit && entry.paymentAmount !== null ? (
                            <span className="text-green-600">({fmt(entry.paymentAmount)})</span>
                          ) : null}
                        </td>

                        {/* Payment column */}
                        <td className="px-4 py-3 text-right font-mono">
                          {isPayment && entry.paymentAmount !== null ? (
                            <span className="text-blue-600">{fmt(entry.paymentAmount)}</span>
                          ) : null}
                        </td>

                        {/* Balance */}
                        <td
                          className={`px-4 py-3 text-right font-mono font-semibold ${
                            isNegBal ? 'text-green-600' : 'text-gray-900'
                          }`}
                        >
                          {fmtBalance(entry.balanceAfter)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Totals footer */}
                {summary && (
                  <tfoot>
                    <tr className="border-t-2 border-gray-300 bg-gray-50">
                      <td colSpan={3} className="px-4 py-3 font-semibold text-gray-700">
                        Balance Due
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">
                        {fmt(summary.totalCharged)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-blue-600">
                        {fmt(summary.totalPaid)}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono font-bold ${balanceColor}`}>
                        {summary.currentBalance < 0
                          ? `(${fmt(Math.abs(summary.currentBalance))}) CR`
                          : fmt(summary.currentBalance)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Post Charge Modal ─────────────────────────────────────────────── */}
      <Modal isOpen={showChargeModal} onClose={() => setShowChargeModal(false)} title="Post Charge">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Charge Code</label>
            <Select value={chargeCode} onChange={(e) => setChargeCode(e.target.value)}>
              {CHARGE_CODES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <Input
              value={chargeDesc}
              onChange={(e) => setChargeDesc(e.target.value)}
              placeholder="e.g. Apartment Rent (2026-08)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={chargeAmount}
              onChange={(e) => setChargeAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Effective Date</label>
            <Input
              type="date"
              value={chargeDate}
              onChange={(e) => setChargeDate(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowChargeModal(false)}>Cancel</Button>
            <Button onClick={handlePostCharge} disabled={postingCharge}>
              {postingCharge ? 'Posting...' : 'Post Charge'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Post Payment Modal ────────────────────────────────────────────── */}
      <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Post Payment">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <Input
              value={paymentDesc}
              onChange={(e) => setPaymentDesc(e.target.value)}
              placeholder="e.g. Cheque #1234 – June rent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Effective Date</label>
            <Input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
            <Button onClick={handlePostPayment} disabled={postingPayment}>
              {postingPayment ? 'Posting...' : 'Post Payment'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Post Credit Modal ─────────────────────────────────────────────── */}
      <Modal isOpen={showCreditModal} onClose={() => setShowCreditModal(false)} title="Post Credit / Concession">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            A credit reduces the tenant's balance. Use this for concessions, adjustments, or write-offs.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <Input
              value={creditDesc}
              onChange={(e) => setCreditDesc(e.target.value)}
              placeholder="e.g. Concession – August 2026"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Effective Date</label>
            <Input
              type="date"
              value={creditDate}
              onChange={(e) => setCreditDate(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreditModal(false)}>Cancel</Button>
            <Button onClick={handlePostCredit} disabled={postingCredit}>
              {postingCredit ? 'Posting...' : 'Post Credit'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
