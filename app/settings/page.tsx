"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Plus, Trash2, Mail, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CardIcon } from "@/components/service-icon";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";

interface PaymentMethod {
  id: string;
  name: string;
  network: string;
  is_default: boolean;
}

interface ConnectedAccount {
  id: string;
  email: string;
  is_active: boolean;
  last_polled_at: string | null;
}

interface UserSettings {
  home_currency: string;
  notifications_enabled: boolean;
  display_name: string;
}

export default function SettingsPage() {
  const supabase = createClient();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
    home_currency: "EUR",
    notifications_enabled: true,
    display_name: "",
  });
  const [newCardName, setNewCardName] = useState("");
  const [newCardNetwork, setNewCardNetwork] = useState("visa");
  const [showAddCard, setShowAddCard] = useState(false);

  const loadData = useCallback(async () => {
    const [pmRes, gmailRes, settingsRes] = await Promise.all([
      fetch("/api/payment-methods"),
      fetch("/api/gmail"),
      fetch("/api/settings"),
    ]);
    const [pms, gmail, s] = await Promise.all([pmRes.json(), gmailRes.json(), settingsRes.json()]);
    setPaymentMethods(Array.isArray(pms) ? pms : []);
    setConnectedAccounts(Array.isArray(gmail) ? gmail : []);
    if (s && !s.error) setSettings(s);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addPaymentMethod = async () => {
    if (!newCardName) return;
    await fetch("/api/payment-methods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCardName, network: newCardNetwork }),
    });
    setNewCardName("");
    setShowAddCard(false);
    loadData();
  };

  const deletePaymentMethod = async (id: string) => {
    await fetch(`/api/payment-methods/${id}`, { method: "DELETE" });
    loadData();
  };

  const connectGmail = async () => {
    const res = await fetch("/api/gmail", { method: "POST" });
    const { url } = await res.json();
    if (url) window.location.href = url;
  };

  const disconnectGmail = async (id: string) => {
    await fetch(`/api/gmail/${id}`, { method: "DELETE" });
    loadData();
  };

  const updateSettings = async (updates: Partial<UserSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const subscribePush = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      alert("Push notifications are not supported on this device.");
      return;
    }

    const reg = await navigator.serviceWorker.ready;
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKey,
    });

    const json = subscription.toJSON();
    await fetch("/api/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: json.keys,
      }),
    });

    updateSettings({ notifications_enabled: true });
  };

  return (
    <div className="px-4 pb-8 pt-safe">
      {/* Header */}
      <div className="flex items-center gap-3 py-4">
        <a href="/" className="p-2 -ml-2">
          <ArrowLeft className="w-5 h-5" />
        </a>
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      <div className="space-y-6">
        {/* Payment Methods */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {paymentMethods.map((pm) => (
              <div key={pm.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <CardIcon network={pm.network} />
                  <span className="text-sm">{pm.name}</span>
                </div>
                <button onClick={() => deletePaymentMethod(pm.id)} className="p-1 text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {showAddCard ? (
              <div className="space-y-2 pt-2 border-t">
                <Input
                  placeholder="Card name (e.g. Main Visa)"
                  value={newCardName}
                  onChange={(e) => setNewCardName(e.target.value)}
                />
                <Select value={newCardNetwork} onValueChange={setNewCardNetwork}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visa">Visa</SelectItem>
                    <SelectItem value="mastercard">Mastercard</SelectItem>
                    <SelectItem value="amex">Amex</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button size="sm" onClick={addPaymentMethod}>Add</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAddCard(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="w-full" onClick={() => setShowAddCard(true)}>
                <Plus className="w-4 h-4 mr-1" /> Add Card
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Connected Accounts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Connected Accounts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {connectedAccounts.map((acc) => (
              <div key={acc.id} className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm">{acc.email}</span>
                  {acc.last_polled_at && (
                    <p className="text-[10px] text-muted-foreground">
                      Last synced: {new Date(acc.last_polled_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <button onClick={() => disconnectGmail(acc.id)} className="p-1 text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full" onClick={connectGmail}>
              <Plus className="w-4 h-4 mr-1" /> Connect Gmail
            </Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label>Push notifications</Label>
              <button
                onClick={() => {
                  if (!settings.notifications_enabled) {
                    subscribePush();
                  } else {
                    updateSettings({ notifications_enabled: false });
                  }
                }}
                className={`w-11 h-6 rounded-full transition-colors relative ${settings.notifications_enabled ? "bg-primary" : "bg-secondary"}`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-background shadow transition-transform ${settings.notifications_enabled ? "left-[22px]" : "left-0.5"}`}
                />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Currency */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Currency</CardTitle>
          </CardHeader>
          <CardContent>
            <Label>Home currency</Label>
            <Select value={settings.home_currency} onValueChange={(v) => updateSettings({ home_currency: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SUPPORTED_CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Account */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Display name</Label>
              <Input
                value={settings.display_name || ""}
                onChange={(e) => updateSettings({ display_name: e.target.value })}
                className="mt-1"
              />
            </div>
            <Button variant="destructive" size="sm" className="w-full" onClick={handleSignOut}>
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
