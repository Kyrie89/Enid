import React, { useState } from "react";
import { S } from "../styles";
import { supabase } from "../supabaseClient";

export function AuthBar({ session, isEditor, displayName }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const sendLink = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setSending(false);
    if (err) setError(err.message);
    else setSent(true);
  };

  const signOut = () => supabase.auth.signOut();

  if (!session) {
    return (
      <div style={S.authBar}>
        {sent ? (
          <div style={S.authStatus}>Check your email for a sign-in link.</div>
        ) : (
          <form style={S.authForm} onSubmit={sendLink}>
            <input
              style={S.authInput}
              type="email"
              placeholder="Staff email for magic-link sign-in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button style={S.authBtn} disabled={sending}>{sending ? "Sending…" : "Sign in"}</button>
          </form>
        )}
        {error && <div style={{ ...S.authStatus, color: "#b3413a" }}>{error}</div>}
      </div>
    );
  }

  return (
    <div style={S.authBar}>
      <div style={S.authStatus}>
        Signed in as {displayName || session.user.email}
        <button style={S.authSignOut} onClick={signOut}>Sign out</button>
      </div>
      {!isEditor && (
        <div style={S.authPending}>
          Your account isn't an approved editor yet — ask an existing editor to add you (Supabase dashboard → editors table).
        </div>
      )}
    </div>
  );
}
