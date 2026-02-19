"use client";

import { useState } from "react";

export default function TipsPage() {
  const [amount, setAmount] = useState("5");
  const [status, setStatus] = useState("");

  function checkout() {
    setStatus(`Hosted checkout started for $${amount}. (No card data stored on EzPlay)`);
  }

  return (
    <main className="space-y-4">
      <h1 className="text-3xl font-black">Support EzPlay</h1>
      <p className="text-sm text-white/70">Tips help keep servers running and new features shipping. No pay-to-win advantages.</p>
      <section className="card space-y-2">
        <label className="text-sm">Amount (USD)
          <input className="ez-input" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
        </label>
        <button className="ez-btn ez-btn-primary" onClick={checkout}>Open Hosted Checkout</button>
        {status && <p className="text-sm text-white/70">{status}</p>}
      </section>
    </main>
  );
}
