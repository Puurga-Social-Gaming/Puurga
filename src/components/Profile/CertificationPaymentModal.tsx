import React, { useMemo, useState } from 'react';
import { CreditCard, Smartphone, Loader2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../lib/axios';
import Button from '../ui/Button';
import CertificationBadges from './CertificationBadges';
import {
  RDC_MOBILE_MONEY_NETWORKS,
  formatCdf,
  formatUsd,
  detectCardBrand,
  type RdcMobileNetworkId,
} from '../../constants/paymentMethods';

export type BuyableCert = {
  slug: string;
  title: string;
  kind: 'check' | 'logo';
  pricePoints: number;
  priceCdf: number;
  priceUsd: number;
  color?: string;
};

interface CertificationPaymentModalProps {
  cert: BuyableCert;
  onClose: () => void;
  onSuccess: () => void;
}

const CertificationPaymentModal: React.FC<CertificationPaymentModalProps> = ({
  cert,
  onClose,
  onSuccess,
}) => {
  const [method, setMethod] = useState<'visa' | 'mobile_money'>('mobile_money');
  const [network, setNetwork] = useState<RdcMobileNetworkId>('airtel');
  const [phone, setPhone] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const brand = useMemo(() => detectCardBrand(cardNumber), [cardNumber]);

  const formatCardInput = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 19);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  };

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        slug: cert.slug,
        method,
      };
      if (method === 'mobile_money') {
        payload.network = network;
        payload.phone = phone;
      } else {
        payload.cardholderName = cardholderName;
        payload.cardNumber = cardNumber.replace(/\D/g, '');
        payload.cardExpiry = cardExpiry;
        // CVV validated client-side only — never sent to API
        if (!/^\d{3,4}$/.test(cardCvv)) {
          toast.error('Enter a valid CVV');
          setSubmitting(false);
          return;
        }
      }

      const { data } = await api.post('/certifications/purchase-money', payload);
      toast.success(data.message || 'Order submitted');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Payment failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-accent mb-1">
              Buy certification
            </p>
            <div className="flex items-center gap-2">
              {cert.kind === 'logo' ? (
                <CertificationBadges logoCertified size="md" />
              ) : (
                <CertificationBadges certificationSlug={cert.slug} size="md" />
              )}
              <h3 className="text-lg font-bold text-foreground truncate">{cert.title}</h3>
            </div>
            <p className="text-sm text-muted mt-1">
              <span className="text-foreground font-semibold tabular-nums">
                {formatCdf(cert.priceCdf)}
              </span>
              <span className="mx-1.5">·</span>
              <span className="tabular-nums">{formatUsd(cert.priceUsd)}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl border border-border text-muted hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-background border border-border">
            <button
              type="button"
              onClick={() => setMethod('mobile_money')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                method === 'mobile_money'
                  ? 'bg-accent text-black'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <Smartphone size={14} />
              Mobile Money
            </button>
            <button
              type="button"
              onClick={() => setMethod('visa')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                method === 'visa'
                  ? 'bg-accent text-black'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <CreditCard size={14} />
              Visa / Card
            </button>
          </div>

          {method === 'mobile_money' ? (
            <div className="space-y-3">
              <p className="text-xs text-muted">
                Réseaux télécoms RDC — Airtel Money, M-Pesa Vodacom, Orange Money, Africell Money.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {RDC_MOBILE_MONEY_NETWORKS.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setNetwork(n.id)}
                    className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      network === n.id
                        ? 'border-accent bg-accent/10'
                        : 'border-border bg-background/50'
                    }`}
                  >
                    <span
                      className="block w-2 h-2 rounded-full mb-1.5"
                      style={{ backgroundColor: n.color }}
                    />
                    <span className="text-xs font-bold text-foreground">{n.shortLabel}</span>
                    <span className="block text-[10px] text-muted mt-0.5">{n.label}</span>
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  Numéro Mobile Money
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="097xxxxxxx"
                  inputMode="tel"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted">
                Visa / Mastercard. Le CVV n’est jamais enregistré sur nos serveurs.
              </p>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Nom sur la carte</label>
                <input
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  placeholder="Nom complet"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  Numéro de carte {brand !== 'card' ? `(${brand})` : ''}
                </label>
                <input
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardInput(e.target.value))}
                  placeholder="ACCT-000003"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/40 tracking-wider"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Expiration</label>
                  <input
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                    placeholder="MM/YY"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">CVV</label>
                  <input
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="123"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </div>
              </div>
            </div>
          )}

          <Button
            variant="primary"
            className="w-full justify-center gap-2"
            disabled={submitting}
            onClick={submit}
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
            Payer {formatCdf(cert.priceCdf)}
          </Button>
          <p className="text-[10px] text-center text-muted leading-relaxed">
            Après paiement, Super Admin confirme la réception et active le badge.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CertificationPaymentModal;
